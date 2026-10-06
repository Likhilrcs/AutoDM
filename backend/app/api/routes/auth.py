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

class ResendOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    token: str

@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[SignupResponse])
async def signup_with_otp(payload: SignupRequest):
    """
    Registers a new user and triggers Supabase email OTP verification.
    """
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Supabase client not configured.")

    try:
        # Create unconfirmed user via sign_up so Supabase automatically dispatches the verification code
        res = client.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {"data": {"name": payload.name or ""}}
        })
        user = res.user
        if not user:
            # Fallback to generate_link if direct sign_up is restricted
            link_res = client.auth.admin.generate_link({
                "type": "signup",
                "email": payload.email,
                "password": payload.password,
                "data": {"name": payload.name or ""}
            })
            user = link_res.user

        return ApiResponse(data=SignupResponse(
            id=user.id,
            email=user.email,
            name=payload.name
        ))

    except Exception as e:
        err_msg = str(e)
        logger.error(f"Signup error: {err_msg}")
        if "already registered" in err_msg.lower():
            raise AppError(code="USER_ALREADY_EXISTS", message="A user with this email already exists.", http_status=409)
        raise AppError(code="SIGNUP_FAILED", message=f"Failed to create account: {err_msg}", http_status=400)

@router.post("/resend-otp", response_model=ApiResponse[dict])
async def resend_signup_otp(payload: ResendOtpRequest):
    """Resend signup OTP code via Supabase."""
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Supabase client not configured.")

    try:
        client.auth.resend({"type": "signup", "email": payload.email})
        return ApiResponse(data={"sent": True, "message": "Verification code resent."})
    except Exception as e:
        logger.warning(f"Error resending OTP: {e}")
        raise AppError(code="RESEND_FAILED", message=str(e), http_status=400)

@router.post("/verify-otp", response_model=ApiResponse[dict])
async def verify_signup_otp(payload: VerifyOtpRequest):
    """Verify signup OTP code with Supabase."""
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Supabase client not configured.")

    clean_token = payload.token.strip().replace(" ", "")
    try:
        res = client.auth.verify_otp({
            "email": payload.email,
            "token": clean_token,
            "type": "signup"
        })
        return ApiResponse(data={"verified": True, "user_id": res.user.id if res.user else None})
    except Exception:
        # Fallback to type 'email'
        try:
            res = client.auth.verify_otp({
                "email": payload.email,
                "token": clean_token,
                "type": "email"
            })
            return ApiResponse(data={"verified": True, "user_id": res.user.id if res.user else None})
        except Exception as e:
            logger.warning(f"OTP verification failed for {payload.email}: {e}")
            raise AppError(code="INVALID_OTP", message="Invalid or expired verification code.", http_status=400)
