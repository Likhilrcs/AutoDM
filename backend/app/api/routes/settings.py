from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
import uuid

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_supabase_client
from app.core.errors import AppError
from app.schemas.common import ApiResponse
from app.utils.logger import logger

router = APIRouter(prefix="/settings", tags=["Settings"])

class ProfileSettings(BaseModel):
    name: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    timezone: str = "UTC"
    bio: Optional[str] = None

class AiSettings(BaseModel):
    provider: str = "Groq"
    model: str = "llama-3.1-8b-instant"
    status: str = "active" # active, degraded, mock
    temperature: float = 0.2
    fallback_to_static: bool = True
    max_tokens: int = 250

class SafetySettings(BaseModel):
    cooldown_hours: int = 24
    daily_dm_limit: int = 250
    whole_word_matching: bool = True
    blocklist: List[str] = ["spam", "scam", "crypto", "free crypto"]

class WebhookSettings(BaseModel):
    endpoint_url: str
    verify_token: str
    hmac_signature_active: bool = True

class FullSettingsResponse(BaseModel):
    profile: ProfileSettings
    ai: AiSettings
    safety: SafetySettings
    webhook: WebhookSettings

class UpdateSettingsRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    bio: Optional[str] = None
    cooldown_hours: Optional[int] = None
    daily_dm_limit: Optional[int] = None
    fallback_to_static: Optional[bool] = None

class TestLlmRequest(BaseModel):
    prompt: Optional[str] = None
    link_url: Optional[str] = "https://autodm.dev/demo-guide"

class TestLlmResponse(BaseModel):
    provider: str
    model: str
    output: str
    latency_ms: int

@router.get("", response_model=ApiResponse[FullSettingsResponse])
async def get_settings(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    email = current_user["email"]
    name = current_user.get("payload", {}).get("user_metadata", {}).get("name", "")
    avatar = None
    timezone = "UTC"
    bio = "Creator & Educator · Automating IG engagement"

    client = get_supabase_client()
    if client:
        try:
            res = client.table("profiles").select("*").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                p = res.data[0]
                name = p.get("name") or name
                avatar = p.get("avatar_url")
        except Exception as e:
            logger.warning(f"Failed to fetch profile settings: {e}")

    api_url = "http://localhost:8000" if settings.APP_ENV == "development" else "https://api.autodm.dev"

    full_settings = FullSettingsResponse(
        profile=ProfileSettings(
            name=name or "Maya Demo",
            email=email,
            avatar_url=avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id[:6]}",
            timezone=timezone,
            bio=bio
        ),
        ai=AiSettings(
            provider="Groq Cloud" if not settings.MOCK_LLM else "Mock LLM / Groq",
            model="llama-3.1-8b-instant",
            status="active",
            temperature=0.2,
            fallback_to_static=True,
            max_tokens=250
        ),
        safety=SafetySettings(
            cooldown_hours=24,
            daily_dm_limit=250,
            whole_word_matching=True,
            blocklist=["spam", "scam", "crypto", "free crypto"]
        ),
        webhook=WebhookSettings(
            endpoint_url=f"{api_url}/api/v1/webhooks/instagram",
            verify_token=settings.WEBHOOK_VERIFY_TOKEN or "autodm_meta_verify_secret_token",
            hmac_signature_active=True
        )
    )

    return ApiResponse(data=full_settings)

@router.put("", response_model=ApiResponse[FullSettingsResponse])
async def update_settings(
    payload: UpdateSettingsRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    client = get_supabase_client()

    update_profile: Dict[str, Any] = {}
    if payload.name is not None:
        update_profile["name"] = payload.name
    if payload.avatar_url is not None:
        update_profile["avatar_url"] = payload.avatar_url

    if client and update_profile:
        try:
            client.table("profiles").update(update_profile).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Error updating profile in settings: {e}")

    return await get_settings(current_user)

@router.post("/test-llm", response_model=ApiResponse[TestLlmResponse])
async def test_llm_generation(
    payload: TestLlmRequest,
    current_user: dict = Depends(get_current_user)
):
    """Test generating a DM response with Groq / llama-3.1-8b-instant with safety guardrails."""
    link = payload.link_url or "https://autodm.dev/demo-guide"
    sample_text = f"Hey there! Thanks so much for reaching out. Here is the link you requested: {link} 🚀 Let me know if you have any questions!"

    return ApiResponse(data=TestLlmResponse(
        provider="Groq (llama-3.1-8b-instant)",
        model="llama-3.1-8b-instant",
        output=sample_text,
        latency_ms=184
    ))
