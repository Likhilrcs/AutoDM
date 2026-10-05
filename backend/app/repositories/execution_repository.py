from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
import uuid
from app.core.db import get_supabase_client
from app.utils.logger import logger

class ExecutionRepository:
    def create_execution(
        self,
        user_id: str,
        automation_id: str,
        incoming_event_id: str,
        dedupe_key: str,
        thread_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None

        data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "automation_id": automation_id,
            "incoming_event_id": incoming_event_id,
            "dedupe_key": dedupe_key,
            "thread_id": thread_id,
            "status": "pending",
            "attempt_count": 0,
        }

        try:
            # Check for duplicate dedupe_key first to preserve atomic guarantee
            existing = client.table("executions").select("id").eq("dedupe_key", dedupe_key).execute()
            if existing.data and len(existing.data) > 0:
                logger.info(f"Duplicate prevented: dedupe_key={dedupe_key} already exists")
                return None

            res = client.table("executions").insert(data).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            # PostgreSQL unique violation error handling
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                logger.info(f"Unique violation prevented duplicate execution for {dedupe_key}")
                return None
            logger.error(f"Error creating execution: {e}")
            return None

    def update_status(
        self,
        execution_id: str,
        status: str,
        failure_code: Optional[str] = None,
        failure_reason: Optional[str] = None,
        increment_attempts: bool = False
    ) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None

        update_dict: Dict[str, Any] = {
            "status": status,
        }
        if failure_code:
            update_dict["failure_code"] = failure_code
        if failure_reason:
            update_dict["failure_reason"] = failure_reason

        now_iso = datetime.now(timezone.utc).isoformat()
        if status in ["success", "failed", "skipped"]:
            update_dict["finished_at"] = now_iso
        elif status == "sending":
            update_dict["started_at"] = now_iso

        try:
            res = client.table("executions").update(update_dict).eq("id", execution_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error updating execution {execution_id} status to {status}: {e}")
            return None

    def get_by_id(self, execution_id: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        try:
            res = client.table("executions").select(
                "*, automations(name), incoming_events(comment_text, commenter_username, external_comment_id), messages(*)"
            ).eq("id", execution_id).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Error fetching execution {execution_id}: {e}")
            return None

    def list(
        self,
        user_id: str,
        status: Optional[str] = None,
        automation_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        client = get_supabase_client()
        if not client:
            return [], 0

        try:
            query = client.table("executions").select(
                "*, automations(name), incoming_events(comment_text, commenter_username)",
                count="exact"
            ).eq("user_id", user_id)

            if status:
                query = query.eq("status", status)
            if automation_id:
                query = query.eq("automation_id", automation_id)

            offset = (page - 1) * page_size
            res = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
            items = res.data or []
            total = res.count or len(items)

            return items, total
        except Exception as e:
            logger.error(f"Error listing executions: {e}")
            return [], 0

execution_repo = ExecutionRepository()
