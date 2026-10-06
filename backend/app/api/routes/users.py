from fastapi import APIRouter, Depends, status
from app.api.deps import get_current_user
from app.core.db import get_supabase_client
from app.schemas.common import ApiResponse
from app.schemas.user import UserProfileResponse, UserProfileUpdate
from app.core.errors import NotFoundError, AppError
from app.utils.logger import logger

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=ApiResponse[UserProfileResponse])
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    email = current_user["email"]
    supabase = get_supabase_client()

    if supabase:
        try:
            res = supabase.table("profiles").select("*").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                profile_row = res.data[0]
                return ApiResponse(data=UserProfileResponse(
                    id=profile_row["id"],
                    email=profile_row["email"],
                    name=profile_row.get("name"),
                    avatar_url=profile_row.get("avatar_url"),
                    created_at=profile_row.get("created_at"),
                    updated_at=profile_row.get("updated_at"),
                ))
        except Exception as e:
            logger.warning(f"Failed to fetch profile from DB: {e}")

    # Fallback to token information if DB row is not yet queried or offline
    return ApiResponse(data=UserProfileResponse(
        id=user_id,
        email=email,
        name=current_user.get("payload", {}).get("user_metadata", {}).get("name", ""),
        avatar_url=None,
    ))

@router.put("/me", response_model=ApiResponse[UserProfileResponse])
async def update_my_profile(
    update_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    supabase = get_supabase_client()

    update_payload = {}
    if update_data.name is not None:
        update_payload["name"] = update_data.name
    if update_data.avatar_url is not None:
        update_payload["avatar_url"] = update_data.avatar_url

    if supabase and update_payload:
        try:
            res = supabase.table("profiles").update(update_payload).eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                profile_row = res.data[0]
                return ApiResponse(data=UserProfileResponse(
                    id=profile_row["id"],
                    email=profile_row["email"],
                    name=profile_row.get("name"),
                    avatar_url=profile_row.get("avatar_url"),
                    created_at=profile_row.get("created_at"),
                    updated_at=profile_row.get("updated_at"),
                ))
        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            raise AppError(code="DATABASE_ERROR", message="Failed to update profile.")

    return ApiResponse(data=UserProfileResponse(
        id=user_id,
        email=current_user["email"],
        name=update_data.name,
        avatar_url=update_data.avatar_url,
    ))

@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    """
    Permanently delete the authenticated user's account and all associated data:
    automations, triggers, executions, steps, messages, incoming events, posts,
    social accounts, tokens, profiles, and auth identity.
    """
    user_id = current_user["id"]
    supabase = get_supabase_client()
    if not supabase:
        raise AppError("DATABASE_ERROR", "Database client unavailable.")

    logger.warning(f"Initiating full account deletion for user: {user_id}")

    try:
        # 1. Social accounts & tokens
        acc_res = supabase.table("social_accounts").select("id").eq("user_id", user_id).execute()
        for s in (acc_res.data or []):
            try:
                supabase.table("social_account_tokens").delete().eq("social_account_id", s["id"]).execute()
            except Exception as e:
                logger.warning(f"Error deleting tokens for social account {s['id']}: {e}")

        # 2. Automations & Triggers
        auto_res = supabase.table("automations").select("id").eq("user_id", user_id).execute()
        for a in (auto_res.data or []):
            try:
                supabase.table("automation_triggers").delete().eq("automation_id", a["id"]).execute()
            except Exception as e:
                logger.warning(f"Error deleting triggers for automation {a['id']}: {e}")

        # 3. Execution steps
        try:
            supabase.table("execution_steps").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting execution_steps for user {user_id}: {e}")

        # 4. Outbound Messages
        try:
            supabase.table("messages").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting messages for user {user_id}: {e}")

        # 5. Executions
        try:
            supabase.table("executions").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting executions for user {user_id}: {e}")

        # 6. Incoming Events
        try:
            supabase.table("incoming_events").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting incoming_events for user {user_id}: {e}")

        # 7. Automations
        try:
            supabase.table("automations").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting automations for user {user_id}: {e}")

        # 8. Posts
        try:
            supabase.table("posts").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting posts for user {user_id}: {e}")

        # 9. Social Accounts
        try:
            supabase.table("social_accounts").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting social_accounts for user {user_id}: {e}")

        # 10. Audit logs
        try:
            supabase.table("audit_logs").delete().eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting audit_logs for user {user_id}: {e}")

        # 11. Profile record
        try:
            supabase.table("profiles").delete().eq("id", user_id).execute()
        except Exception as e:
            logger.warning(f"Error deleting profile for user {user_id}: {e}")

        # 12. Supabase Auth identity
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception as e:
            logger.warning(f"Error deleting auth user {user_id}: {e}")

        logger.info(f"Successfully deleted user {user_id} and all related database records.")
        return {"success": True, "message": "Account and all associated data have been permanently deleted."}
    except Exception as e:
        logger.error(f"Error deleting account {user_id}: {e}")
        raise AppError("DELETE_FAILED", f"Failed to delete account: {e}")
