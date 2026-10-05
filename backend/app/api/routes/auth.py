from fastapi import APIRouter, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid

from app.core.db import get_supabase_client
from app.core.errors import AppError, ValidationError
from app.schemas.common import ApiResponse
from app.utils.logger import logger

router = APIRouter(prefix="/auth", tags=["Auth"])

class SignupRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    name: Optional[str] = None

class SignupResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[SignupResponse])
async def admin_signup(payload: SignupRequest):
    """
    Direct server-side signup via Supabase Admin API:
    - Automatically confirms email (bypasses email rate limits)
    - Bypasses 'Signups not allowed for this instance' restrictions
    - Triggers profiles creation and seeds initial mock social account
    """
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Supabase admin client not configured.")

    try:
        # Create user via admin API
        user_res = client.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"name": payload.name or ""}
        })
        user = user_res.user

        # Seed initial mock social account for the new user so they can immediately test automations
        try:
            client.table("social_accounts").insert({
                "id": str(uuid.uuid4()),
                "user_id": user.id,
                "platform": "mock",
                "external_account_id": f"mock_ig_{user.id[:8]}",
                "username": f"{payload.name.lower().replace(' ', '') if payload.name else 'creator'}.creates",
                "account_type": "MEDIA_CREATOR",
                "status": "connected"
            }).execute()
        except Exception as e:
            logger.warning(f"Could not seed default social account for new user: {e}")

        return ApiResponse(data=SignupResponse(
            id=user.id,
            email=user.email,
            name=payload.name
        ))

    except Exception as e:
        err_msg = str(e)
        logger.error(f"Admin signup error: {err_msg}")
        if "already registered" in err_msg.lower():
            raise AppError(code="USER_ALREADY_EXISTS", message="A user with this email already exists.", http_status=409)
        raise AppError(code="SIGNUP_FAILED", message=f"Failed to create account: {err_msg}", http_status=400)
