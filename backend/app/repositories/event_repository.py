from typing import Any, Dict, Optional
import uuid
from app.core.db import get_supabase_client
from app.utils.logger import logger

class EventRepository:
    def get_incoming_event(self, incoming_event_id: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        try:
            res = client.table("incoming_events").select("*, social_accounts(*)").eq("id", incoming_event_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            logger.error(f"Error fetching incoming event {incoming_event_id}: {e}")
            return None

    def create_incoming_event(
        self,
        user_id: str,
        social_account_id: str,
        external_comment_id: str,
        external_post_id: str,
        commenter_id: str,
        commenter_username: str,
        comment_text: str,
        normalized_text: str,
        webhook_event_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "social_account_id": social_account_id,
            "webhook_event_id": webhook_event_id,
            "external_comment_id": external_comment_id,
            "external_post_id": external_post_id,
            "commenter_id": commenter_id,
            "commenter_username": commenter_username,
            "comment_text": comment_text,
            "normalized_text": normalized_text,
        }
        try:
            res = client.table("incoming_events").upsert(data, on_conflict="social_account_id, external_comment_id").execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return data
        except Exception as e:
            logger.error(f"Error creating incoming event: {e}")
            return None

event_repo = EventRepository()
