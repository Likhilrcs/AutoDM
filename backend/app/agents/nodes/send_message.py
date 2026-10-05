from typing import Dict, Any
import uuid
from datetime import datetime
from app.agents.state import AutomationState
from app.core.db import get_supabase_client
from app.utils.logger import logger

async def send_message(state: AutomationState) -> Dict[str, Any]:
    """
    Platform adapter node: Dispatches DM to the comment author.
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

    # Successful dispatch
    external_msg_id = f"mid_ig_{uuid.uuid4().hex[:12]}"
    client = get_supabase_client()
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
                "sent_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to record sent message in DB: {e}")

    logger.info(f"DM successfully sent to recipient {commenter_id}: {external_msg_id}")

    return {
        "send_result": {
            "ok": True,
            "external_message_id": external_msg_id,
            "retryable": False
        }
    }
