from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
import uuid
from app.core.db import get_supabase_client
from app.core.errors import AppError, NotFoundError, ForbiddenError
from app.utils.logger import logger

class AutomationRepository:
    def __init__(self):
        pass

    def check_social_account_ownership(self, user_id: str, social_account_id: str) -> bool:
        client = get_supabase_client()
        if not client:
            return True # In test mock mode allow unless mocked otherwise
        try:
            res = client.table("social_accounts").select("id, user_id").eq("id", social_account_id).execute()
            if not res.data:
                return False
            return str(res.data[0]["user_id"]) == str(user_id)
        except Exception as e:
            logger.error(f"Error checking social account ownership: {e}")
            return False

    def find_active_conflict(
        self,
        social_account_id: str,
        external_post_id: str,
        keyword_normalized: str,
        exclude_id: Optional[str] = None
    ) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            # Query active automations for the same account + post
            query = client.table("automations").select("id, status, deleted_at, automation_triggers(keyword_normalized)").eq(
                "social_account_id", social_account_id
            ).eq("external_post_id", external_post_id).eq("status", "active").is_("deleted_at", "null")

            res = query.execute()
            for row in (res.data or []):
                if exclude_id and str(row["id"]) == str(exclude_id):
                    continue
                triggers = row.get("automation_triggers") or []
                if isinstance(triggers, dict):
                    triggers = [triggers]
                for trg in triggers:
                    if trg.get("keyword_normalized") == keyword_normalized:
                        return True
            return False
        except Exception as e:
            logger.error(f"Error finding active conflict: {e}")
            return False

    def list(
        self,
        user_id: str,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        client = get_supabase_client()
        if not client:
            return [], 0

        try:
            query = client.table("automations").select(
                "*, automation_triggers(*)",
                count="exact"
            ).eq("user_id", user_id).is_("deleted_at", "null")

            if status:
                query = query.eq("status", status)

            if search:
                query = query.ilike("name", f"%{search}%")

            offset = (page - 1) * page_size
            res = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()
            items = res.data or []
            total = res.count or len(items)

            # Compute stats or executions count for each item
            for item in items:
                triggers = item.get("automation_triggers") or []
                item["trigger"] = triggers[0] if (triggers and isinstance(triggers, list)) else triggers
                item["keyword"] = item["trigger"].get("keyword", "") if item.get("trigger") else ""

                # Query execution count for this automation
                exec_res = client.table("executions").select("id", count="exact").eq("automation_id", item["id"]).execute()
                item["executions"] = exec_res.count or 0

            return items, total
        except Exception as e:
            logger.error(f"Error listing automations: {e}")
            return [], 0

    def get_by_id(self, user_id: str, automation_id: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None

        try:
            res = client.table("automations").select("*, automation_triggers(*)").eq("id", automation_id).eq("user_id", user_id).is_("deleted_at", "null").execute()
            if not res.data:
                return None

            item = res.data[0]
            triggers = item.get("automation_triggers") or []
            item["trigger"] = triggers[0] if (triggers and isinstance(triggers, list)) else triggers

            # Query stats: total executions, success, failed
            stats_res = client.table("executions").select("status").eq("automation_id", automation_id).execute()
            stats = {"executions": len(stats_res.data or []), "success": 0, "failed": 0}
            for row in (stats_res.data or []):
                if row.get("status") == "success":
                    stats["success"] += 1
                elif row.get("status") == "failed":
                    stats["failed"] += 1
            item["stats"] = stats

            return item
        except Exception as e:
            logger.error(f"Error getting automation by id: {e}")
            return None

    def create(self, user_id: str, data: Dict[str, Any], keyword_normalized: str) -> Dict[str, Any]:
        client = get_supabase_client()
        if not client:
            raise AppError("DATABASE_ERROR", "Database client not available.")

        trigger_data = data.pop("trigger")
        auto_id = str(uuid.uuid4())
        data["id"] = auto_id
        data["user_id"] = user_id

        try:
            # Insert automation
            auto_res = client.table("automations").insert(data).execute()
            if not auto_res.data:
                raise AppError("DATABASE_ERROR", "Failed to insert automation row.")

            # Insert trigger
            trg_insert = {
                "id": str(uuid.uuid4()),
                "automation_id": auto_id,
                "trigger_type": trigger_data.get("type", "comment_keyword"),
                "keyword": trigger_data["keyword"],
                "keyword_normalized": keyword_normalized,
                "match_mode": trigger_data.get("match_mode", "contains"),
                "case_sensitive": trigger_data.get("case_sensitive", False),
            }
            trg_res = client.table("automation_triggers").insert(trg_insert).execute()

            result = auto_res.data[0]
            result["trigger"] = trg_res.data[0] if trg_res.data else trg_insert
            result["stats"] = {"executions": 0, "success": 0, "failed": 0}
            return result
        except Exception as e:
            logger.error(f"Error creating automation: {e}")
            raise AppError("DATABASE_ERROR", f"Failed to create automation: {str(e)}")

    def update(
        self,
        user_id: str,
        automation_id: str,
        update_data: Dict[str, Any],
        keyword_normalized: Optional[str] = None
    ) -> Dict[str, Any]:
        client = get_supabase_client()
        if not client:
            raise AppError("DATABASE_ERROR", "Database client not available.")

        trigger_data = update_data.pop("trigger", None)

        try:
            if update_data:
                client.table("automations").update(update_data).eq("id", automation_id).eq("user_id", user_id).execute()

            if trigger_data:
                trg_update = {
                    "keyword": trigger_data["keyword"],
                    "match_mode": trigger_data.get("match_mode", "contains"),
                    "case_sensitive": trigger_data.get("case_sensitive", False),
                }
                if keyword_normalized is not None:
                    trg_update["keyword_normalized"] = keyword_normalized

                client.table("automation_triggers").update(trg_update).eq("automation_id", automation_id).execute()

            return self.get_by_id(user_id, automation_id)
        except Exception as e:
            logger.error(f"Error updating automation: {e}")
            raise AppError("DATABASE_ERROR", f"Failed to update automation: {str(e)}")

    def soft_delete(self, user_id: str, automation_id: str) -> bool:
        client = get_supabase_client()
        if not client:
            return False
        try:
            client.table("automations").update({
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "status": "paused",
            }).eq("id", automation_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error soft deleting automation: {e}")
            return False

    def set_status(self, user_id: str, automation_id: str, status: str) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None
        try:
            client.table("automations").update({"status": status}).eq("id", automation_id).eq("user_id", user_id).execute()
            return self.get_by_id(user_id, automation_id)
        except Exception as e:
            logger.error(f"Error setting automation status: {e}")
            return None

    def record_audit(self, user_id: str, action: str, entity_id: str, metadata: Dict[str, Any]):
        client = get_supabase_client()
        if not client:
            return
        try:
            client.table("audit_logs").insert({
                "user_id": user_id,
                "action": action,
                "entity_type": "automation",
                "entity_id": entity_id,
                "metadata": metadata,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to record audit log: {e}")

automation_repo = AutomationRepository()
