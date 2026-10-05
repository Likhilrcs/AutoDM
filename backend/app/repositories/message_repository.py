from typing import Any, Dict, Optional
from datetime import datetime, timezone
import uuid
from app.core.db import get_supabase_client
from app.utils.logger import logger

class MessageRepository:
    def create_message(
        self,
        user_id: str,
        execution_id: str,
        automation_id: Optional[str],
        platform: str,
        recipient_id: Optional[str],
        comment_id: Optional[str],
        body: str,
        status: str = "sent",
        external_message_id: Optional[str] = None,
        response_payload: Optional[Dict[str, Any]] = None,
        generation_mode: str = "static",
        ai_model: Optional[str] = None,
        attempt_no: int = 1
    ) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None

        data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "execution_id": execution_id,
            "automation_id": automation_id,
            "platform": platform,
            "recipient_id": recipient_id,
            "comment_id": comment_id,
            "body": body,
            "status": status,
            "external_message_id": external_message_id,
            "response_payload": response_payload or {},
            "attempt_no": attempt_no,
            "generation_mode": generation_mode,
            "ai_model": ai_model,
            "sent_at": datetime.now(timezone.utc).isoformat() if status == "sent" else None,
        }

        try:
            res = client.table("messages").insert(data).execute()
            return res.data[0] if res.data else data
        except Exception as e:
            logger.error(f"Error persisting message: {e}")
            return None

    def has_sent_message(self, execution_id: str) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            res = client.table("messages").select("id").eq("execution_id", execution_id).eq("status", "sent").limit(1).execute()
            return bool(res.data and len(res.data) > 0)
        except Exception as e:
            logger.error(f"Error checking sent message: {e}")
            return False

message_repo = MessageRepository()
