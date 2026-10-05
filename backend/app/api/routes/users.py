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
