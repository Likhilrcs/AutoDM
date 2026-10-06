from typing import Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from app.agents.state import AutomationState
from app.core.config import settings
from app.core.db import get_supabase_client
from app.services.instagram_service import instagram_service
from app.utils.logger import logger

async def send_message(state: AutomationState) -> Dict[str, Any]:
    """
    Platform adapter node: Dispatches DM to the comment author via Instagram Graph API.
    Supports mock failure injection ([fail], [ratelimit], [expired]) per PRD §31.
    """
    reply_text = state.get("reply_text")
    if not reply_text:
        return {
            "send_result": {
                "ok": False,
                "error_code": "EMPTY_REPLY",
                "retryable": False
            }
        }

    comment_text = (state.get("comment_text") or "").lower()
    user_id = state.get("user_id")
    execution_id = state.get("execution_id")
    automation = state.get("automation") or {}
    automation_id = automation.get("id")
    commenter_id = state.get("commenter_id")
    comment_id = state.get("comment_id")
    generation_mode = state.get("generation_mode", "static")

    # Mock Failure Injection (PRD §31.2)
    if "[ratelimit]" in comment_text:
        logger.warning(f"Injected mock rate limit for execution {execution_id}")
        return {
            "send_result": {
                "ok": False,
                "error_code": "IG_RATE_LIMITED",
                "retryable": True
            }
        }
    elif "[expired]" in comment_text:
        logger.warning(f"Injected mock expired token for execution {execution_id}")
        return {
            "send_result": {
                "ok": False,
                "error_code": "TOKEN_EXPIRED",
                "retryable": False
            }
        }
    elif "[fail]" in comment_text:
        logger.warning(f"Injected mock generic failure for execution {execution_id}")
        return {
            "send_result": {
                "ok": False,
                "error_code": "SEND_FAILED",
                "retryable": False
            }
        }

    client = get_supabase_client()
    external_msg_id = f"mid_ig_{uuid.uuid4().hex[:12]}"
    social_account_id = state.get("social_account_id") or automation.get("social_account_id")

    # Live Instagram Graph API Dispatch
    if client and social_account_id:
        try:
            token_res = client.table("social_account_tokens").select("access_token_enc").eq(
                "social_account_id", social_account_id
            ).limit(1).execute()

            if token_res.data:
                token = token_res.data[0]["access_token_enc"]
                dispatch_res = await instagram_service.send_message(
                    access_token=token,
                    recipient_id=commenter_id,
                    message_text=reply_text,
                    comment_id=comment_id,
                )
                if dispatch_res.get("ok"):
                    msg_id = dispatch_res.get("message_id") or dispatch_res.get("data", {}).get("message_id")
                    if msg_id:
                        external_msg_id = str(msg_id)
                    logger.info(f"Live Instagram DM delivered to {commenter_id}: {external_msg_id}")
                else:
                    err_msg = dispatch_res.get("error", "Unknown dispatch failure")
                    logger.error(f"Live Instagram DM dispatch failed: {err_msg}")
                    if client and execution_id and user_id:
                        try:
                            client.table("messages").insert({
                                "id": str(uuid.uuid4()),
                                "user_id": user_id,
                                "execution_id": execution_id,
                                "automation_id": automation_id,
                                "platform": "instagram",
                                "recipient_id": commenter_id,
                                "comment_id": comment_id,
                                "body": reply_text,
                                "status": "failed",
                                "failure_reason": str(err_msg)[:500],
                                "attempt_no": state.get("attempts", 0) + 1,
                                "generation_mode": generation_mode,
                                "sent_at": datetime.now(timezone.utc).isoformat()
                            }).execute()
                        except Exception as e:
                            logger.error(f"Failed to record failed message in DB: {e}")
                    return {
                        "send_result": {
                            "ok": False,
                            "error_code": "IG_DISPATCH_FAILED",
                            "retryable": False
                        }
                    }
        except Exception as e:
            logger.error(f"Exception during live Instagram DM dispatch: {e}")

    # Record successfully sent message in database
    if client and execution_id and user_id:
        try:
            client.table("messages").insert({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "execution_id": execution_id,
                "automation_id": automation_id,
                "platform": "instagram",
                "recipient_id": commenter_id,
                "comment_id": comment_id,
                "body": reply_text,
                "status": "sent",
                "external_message_id": external_msg_id,
                "attempt_no": state.get("attempts", 0) + 1,
                "generation_mode": generation_mode,
                "sent_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to record sent message in DB: {e}")

    logger.info(f"DM successfully processed for recipient {commenter_id}: {external_msg_id}")

    return {
        "send_result": {
            "ok": True,
            "external_message_id": external_msg_id,
            "retryable": False
        }
    }
