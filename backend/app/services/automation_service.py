from typing import Any, Dict, List, Optional, Tuple
from app.repositories.automation_repository import automation_repo
from app.schemas.automation import AutomationCreate, AutomationUpdate
from app.core.errors import (
    AppError,
    NotFoundError,
    ForbiddenError,
    ConflictError,
    ValidationError
)
from app.utils.text import normalize

class AutomationService:
    def list_automations(
        self,
        user_id: str,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        return automation_repo.list(user_id, status, search, page, page_size)

    def get_automation(self, user_id: str, automation_id: str) -> Dict[str, Any]:
        item = automation_repo.get_by_id(user_id, automation_id)
        if not item:
            raise NotFoundError(code="AUTOMATION_NOT_FOUND", message=f"Automation {automation_id} not found.")
        return item

    def create_automation(self, user_id: str, payload: AutomationCreate) -> Dict[str, Any]:
        # 1. Ownership check: verify social_account_id belongs to user
        if not payload.social_account_id or payload.social_account_id == "11111111-1111-1111-1111-111111111111":
            default_acc = automation_repo.get_default_social_account(user_id)
            if default_acc:
                payload.social_account_id = str(default_acc["id"])

        if not automation_repo.check_social_account_ownership(user_id, payload.social_account_id):
            default_acc = automation_repo.get_default_social_account(user_id)
            if default_acc:
                payload.social_account_id = str(default_acc["id"])
            else:
                raise ForbiddenError("You do not own this social account or it does not exist.")

        # 2. Normalize keyword
        keyword_norm = normalize(payload.trigger.keyword, payload.trigger.case_sensitive)

        # 3. Conflict check if status is active
        if payload.status == "active":
            has_conflict = automation_repo.find_active_conflict(
                social_account_id=payload.social_account_id,
                external_post_id=payload.external_post_id,
                keyword_normalized=keyword_norm
            )
            if has_conflict:
                raise ConflictError(
                    code="AUTOMATION_CONFLICT",
                    message="An active automation with the same post and keyword already exists."
                )

        data = payload.model_dump()
        result = automation_repo.create(user_id, data, keyword_norm)

        # Record audit log
        automation_repo.record_audit(
            user_id=user_id,
            action="automation.created",
            entity_id=result["id"],
            metadata={"name": result["name"], "status": result["status"]}
        )

        return result

    def update_automation(self, user_id: str, automation_id: str, payload: AutomationUpdate) -> Dict[str, Any]:
        existing = self.get_automation(user_id, automation_id)

        update_dict = payload.model_dump(exclude_unset=True)
        keyword_norm = None

        if payload.trigger:
            case_sensitive = payload.trigger.case_sensitive
            keyword_norm = normalize(payload.trigger.keyword, case_sensitive)

            target_status = payload.status or existing.get("status")
            if target_status == "active":
                has_conflict = automation_repo.find_active_conflict(
                    social_account_id=existing["social_account_id"],
                    external_post_id=existing["external_post_id"],
                    keyword_normalized=keyword_norm,
                    exclude_id=automation_id
                )
                if has_conflict:
                    raise ConflictError(
                        code="AUTOMATION_CONFLICT",
                        message="Another active automation on this post already uses this keyword."
                    )

        result = automation_repo.update(user_id, automation_id, update_dict, keyword_norm)

        automation_repo.record_audit(
            user_id=user_id,
            action="automation.updated",
            entity_id=automation_id,
            metadata={"updated_fields": list(update_dict.keys())}
        )

        return result

    def activate_automation(self, user_id: str, automation_id: str) -> Dict[str, Any]:
        existing = self.get_automation(user_id, automation_id)

        trigger = existing.get("trigger", {})
        keyword_norm = trigger.get("keyword_normalized") or normalize(trigger.get("keyword", ""))

        has_conflict = automation_repo.find_active_conflict(
            social_account_id=existing["social_account_id"],
            external_post_id=existing["external_post_id"],
            keyword_normalized=keyword_norm,
            exclude_id=automation_id
        )
        if has_conflict:
            raise ConflictError(
                code="AUTOMATION_CONFLICT",
                message="Cannot activate: an active automation with the same post and keyword already exists."
            )

        updated = automation_repo.set_status(user_id, automation_id, "active")
        automation_repo.record_audit(
            user_id=user_id,
            action="automation.activated",
            entity_id=automation_id,
            metadata={"status": "active"}
        )
        return updated or existing

    def pause_automation(self, user_id: str, automation_id: str) -> Dict[str, Any]:
        existing = self.get_automation(user_id, automation_id)
        updated = automation_repo.set_status(user_id, automation_id, "paused")
        automation_repo.record_audit(
            user_id=user_id,
            action="automation.paused",
            entity_id=automation_id,
            metadata={"status": "paused"}
        )
        return updated or existing

    def delete_automation(self, user_id: str, automation_id: str):
        existing = self.get_automation(user_id, automation_id)
        automation_repo.soft_delete(user_id, automation_id)
        automation_repo.record_audit(
            user_id=user_id,
            action="automation.deleted",
            entity_id=automation_id,
            metadata={"name": existing.get("name")}
        )

automation_service = AutomationService()
