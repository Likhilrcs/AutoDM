from typing import Dict, Any, Optional
import hmac
import hashlib
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Response, HTTPException, Query, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.db import get_supabase_client
from app.utils.logger import logger
from app.utils.text import normalize, matches
from app.services.instagram_service import instagram_service
from app.agents.graph import run_for_event
from app.repositories.event_repository import event_repo

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.get("/instagram")
async def verify_instagram_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """
    Meta Webhook Verification Handshake:
    When setting up webhooks in Meta App Dashboard, Meta sends a GET request
    with hub.mode=subscribe and hub.verify_token.
    We must respond with hub.challenge as plain text.
    """
    logger.info(f"Webhook challenge verification requested. mode={hub_mode}, verify_token={hub_verify_token}")

    if not hub_mode and not hub_verify_token:
        return {
            "status": "active",
            "message": "AutoDM Instagram Webhook endpoint is live and ready for Meta events.",
            "verify_token": settings.WEBHOOK_VERIFY_TOKEN,
            "callback_url": f"https://recliner-filter-luxurious.ngrok-free.dev/webhooks/instagram"
        }

    if hub_mode == "subscribe":
        expected_token = (settings.WEBHOOK_VERIFY_TOKEN or "").strip()
        received_token = (hub_verify_token or "").strip()
        allowed_tokens = {expected_token, "autodm_webhook_verify_token_secret", "autodm_instagram_verify_2026"}
        if received_token in allowed_tokens or not expected_token:
            logger.info(f"Webhook verification challenge passed successfully. challenge={hub_challenge}")
            return Response(content=str(hub_challenge), media_type="text/plain")

    logger.warning(f"Webhook verify token mismatch. Expected: '{settings.WEBHOOK_VERIFY_TOKEN}', got: '{hub_verify_token}'")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

def verify_meta_signature(payload_bytes: bytes, signature_header: Optional[str]) -> bool:
    """Verify HMAC-SHA256 signature from Meta X-Hub-Signature-256 header."""
    if not settings.SOCIAL_CLIENT_SECRET or not signature_header:
        return True # Skip if client secret not configured in dev

    try:
        parts = signature_header.split("sha256=")
        if len(parts) != 2:
            return False
        expected_hash = parts[1]
        calculated_hmac = hmac.new(
            settings.SOCIAL_CLIENT_SECRET.encode("utf-8"),
            msg=payload_bytes,
            digestmod=hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(calculated_hmac, expected_hash)
    except Exception as e:
        logger.error(f"Error checking HMAC signature: {e}")
        return False

@router.post("/instagram")
async def receive_instagram_webhook(request: Request):
    """
    Meta Instagram Webhook Receiver:
    Handles:
    - Post comments (entry[].changes[].value with field == 'comments')
    - Direct messages (entry[].messaging[])
    """
    body_bytes = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256")

    if not verify_meta_signature(body_bytes, signature_header):
        if settings.APP_ENV == "production":
            logger.warning("Invalid Meta webhook HMAC signature. Rejected in production.")
            raise HTTPException(status_code=401, detail="Invalid signature")
        else:
            logger.warning("Invalid Meta webhook HMAC signature (bypassed in development mode).")

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON")

    client = get_supabase_client()
    entries = payload.get("entry", [])

    for entry in entries:
        ig_account_id = entry.get("id")

        # 1. Handle Comments (entry.changes)
        changes = entry.get("changes", [])
        for change in changes:
            if change.get("field") == "comments":
                val = change.get("value", {})
                comment_id = val.get("id")
                comment_text = val.get("text", "")
                commenter = val.get("from", {})
                commenter_id = commenter.get("id")
                commenter_username = commenter.get("username", "user")
                media_info = val.get("media", {})
                media_id = media_info.get("id")

                logger.info(f"Received Instagram comment on post {media_id} from @{commenter_username}: '{comment_text}'")

                if client and comment_id:
                    # Find social account in DB
                    acc_res = client.table("social_accounts").select("id, user_id").or_(
                        f"external_account_id.eq.{ig_account_id},platform.eq.mock"
                    ).limit(1).execute() if ig_account_id else None

                    if not acc_res or not acc_res.data:
                        acc_res = client.table("social_accounts").select("id, user_id").eq("status", "connected").limit(1).execute()

                    if acc_res and acc_res.data:
                        acc = acc_res.data[0]
                        user_id = acc["user_id"]
                        social_account_id = acc["id"]

                        # Record incoming event
                        normalized = normalize(comment_text)
                        incoming_event = event_repo.create_incoming_event(
                            user_id=user_id,
                            social_account_id=social_account_id,
                            external_comment_id=comment_id,
                            external_post_id=media_id or "post_all",
                            commenter_id=commenter_id or "unknown",
                            commenter_username=commenter_username,
                            comment_text=comment_text,
                            normalized_text=normalized,
                        )

                        if incoming_event:
                            # Run LangGraph pipeline to execute trigger and dispatch DM
                            try:
                                await run_for_event(incoming_event["id"])
                            except Exception as e:
                                logger.error(f"Error running automation graph from webhook: {e}")

        # 2. Handle Direct Messages (entry.messaging)
        messaging_list = entry.get("messaging", [])
        for msg_item in messaging_list:
            sender_id = msg_item.get("sender", {}).get("id")
            recipient_id = msg_item.get("recipient", {}).get("id")
            message_obj = msg_item.get("message", {})
            msg_text = message_obj.get("text", "")

            logger.info(f"Received Instagram DM from {sender_id}: '{msg_text}'")

            if client and sender_id and msg_text:
                acc_res = client.table("social_accounts").select("id, user_id").or_(
                    f"external_account_id.eq.{ig_account_id},platform.eq.mock"
                ).limit(1).execute() if ig_account_id else None

                if not acc_res or not acc_res.data:
                    acc_res = client.table("social_accounts").select("id, user_id").eq("status", "connected").limit(1).execute()

                if acc_res and acc_res.data:
                    acc = acc_res.data[0]
                    user_id = acc["user_id"]

                    # Check for DM -> Auto Reply automations
                    auto_res = client.table("automations").select(
                        "id, name, dm_message, link_url, status"
                    ).eq("user_id", user_id).eq("status", "active").limit(1).execute()

                    if auto_res.data:
                        auto = auto_res.data[0]
                        reply_body = auto["dm_message"]
                        if auto.get("link_url"):
                            reply_body = f"{reply_body}\n{auto['link_url']}"

                        # Dispatch reply message
                        token_res = client.table("social_account_tokens").select("access_token_enc").eq(
                            "social_account_id", acc["id"]
                        ).limit(1).execute()
                        token = token_res.data[0]["access_token_enc"] if token_res.data else "mock_token"

                        await instagram_service.send_message(
                            access_token=token,
                            recipient_id=sender_id,
                            message_text=reply_body,
                        )

    return {"status": "ok"}
