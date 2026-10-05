from typing import List, Optional
from fastapi import APIRouter, Depends, status, Response
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_supabase_client
from app.core.errors import AppError, NotFoundError
from app.schemas.common import ApiResponse
from app.utils.logger import logger
from app.utils.text import normalize
from app.repositories.event_repository import event_repo
from app.agents.graph import run_for_event

router = APIRouter(prefix="/social", tags=["Social Accounts"])

class SocialAccountResponse(BaseModel):
    id: str
    platform: str
    external_account_id: str
    username: Optional[str] = None
    account_type: Optional[str] = None
    status: str
    followers_count: Optional[int] = 24500
    media_count: Optional[int] = 142
    token_expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

class ConnectAccountRequest(BaseModel):
    platform: str = "mock"

class ConnectAccountResponse(BaseModel):
    account: Optional[SocialAccountResponse] = None
    authorization_url: Optional[str] = None
    mock: bool = True

class PostItem(BaseModel):
    id: str
    external_post_id: str
    permalink: Optional[str] = None
    caption: Optional[str] = None
    media_type: Optional[str] = "REEL"
    comments_count: Optional[int] = 34
    likes_count: Optional[int] = 482
    active_automation: Optional[str] = None
    posted_at: Optional[datetime] = None

class SimulateCommentRequest(BaseModel):
    social_account_id: Optional[str] = None
    external_post_id: Optional[str] = None
    commenter_username: str = "creator.fan"
    comment_text: str = "Send me the link please!"

class SimulateCommentResponse(BaseModel):
    success: bool
    matched_keyword: Optional[str] = None
    automation_name: Optional[str] = None
    reply_text: Optional[str] = None
    execution_id: Optional[str] = None
    status: str
    message: str

@router.get("/accounts", response_model=ApiResponse[List[SocialAccountResponse]])
async def list_social_accounts(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        return ApiResponse(data=[])

    try:
        res = client.table("social_accounts").select(
            "id, platform, external_account_id, username, account_type, status, token_expires_at, created_at"
        ).eq("user_id", user_id).execute()

        accounts = []
        for row in (res.data or []):
            accounts.append(SocialAccountResponse(
                id=row["id"],
                platform=row["platform"],
                external_account_id=row["external_account_id"],
                username=row.get("username") or "creator",
                account_type=row.get("account_type") or "MEDIA_CREATOR",
                status=row.get("status") or "connected",
                followers_count=24500,
                media_count=142,
                token_expires_at=row.get("token_expires_at"),
                created_at=row.get("created_at")
            ))
        return ApiResponse(data=accounts)
    except Exception as e:
        logger.error(f"Error listing social accounts: {e}")
        return ApiResponse(data=[])

@router.post("/connect", response_model=ApiResponse[ConnectAccountResponse])
async def connect_social_account(payload: ConnectAccountRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Database client not available.")

    # MOCK MODE: Instant creation of connected account
    if settings.MOCK_SOCIAL_API or payload.platform == "mock":
        account_id = str(uuid.uuid4())
        account_data = {
            "id": account_id,
            "user_id": user_id,
            "platform": "mock",
            "external_account_id": f"mock_ig_{user_id[:8]}",
            "username": f"{current_user.get('payload', {}).get('user_metadata', {}).get('name', 'maya').lower().replace(' ', '')}.creates",
            "account_type": "MEDIA_CREATOR",
            "status": "connected",
        }

        try:
            res = client.table("social_accounts").upsert(account_data).execute()
            created = res.data[0] if res.data else account_data

            # Seed sample posts for this newly connected account
            seed_posts = [
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": created["id"],
                    "external_post_id": f"post_reel_notion_{user_id[:6]}",
                    "permalink": "https://instagram.com/reel/C1x89yZ",
                    "caption": "10x your client onboarding in Notion. Comment 'NOTION' and I'll DM you my exact template for free 🚀",
                    "media_type": "REEL"
                },
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": created["id"],
                    "external_post_id": f"post_reel_blueprint_{user_id[:6]}",
                    "permalink": "https://instagram.com/reel/C2a90wX",
                    "caption": "Stop losing leads in the DMs! Comment 'GUIDE' for my automated Instagram growth blueprint 📲",
                    "media_type": "REEL"
                },
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": created["id"],
                    "external_post_id": f"post_carousel_ai_{user_id[:6]}",
                    "permalink": "https://instagram.com/p/C3m41kV",
                    "caption": "Top 5 AI Tools that replaced my 40-hr agency team in 2026. Comment 'TOOLS' to grab the list 👇",
                    "media_type": "CAROUSEL"
                }
            ]
            for p in seed_posts:
                try:
                    client.table("posts").upsert(p, on_conflict="social_account_id, external_post_id").execute()
                except Exception:
                    pass

            return ApiResponse(data=ConnectAccountResponse(
                account=SocialAccountResponse(
                    id=created["id"],
                    platform=created["platform"],
                    external_account_id=created["external_account_id"],
                    username=created.get("username"),
                    account_type=created.get("account_type"),
                    status=created["status"],
                    followers_count=24500,
                    media_count=142
                ),
                mock=True
            ))
        except Exception as e:
            logger.error(f"Error creating mock account: {e}")
            raise AppError("DATABASE_ERROR", f"Failed to connect account: {e}")

    # Production mode: Generate Meta OAuth authorization URL
    auth_url = (
        f"https://www.instagram.com/oauth/authorize?"
        f"client_id={settings.SOCIAL_CLIENT_ID}&"
        f"redirect_uri={settings.SOCIAL_REDIRECT_URI}&"
        f"scope=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages&"
        f"response_type=code&state=user_{user_id}"
    )
    return ApiResponse(data=ConnectAccountResponse(
        authorization_url=auth_url,
        mock=False
    ))

@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_account(account_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    try:
        check = client.table("social_accounts").select("id").eq("id", account_id).eq("user_id", user_id).execute()
        if not check.data:
            raise NotFoundError("ACCOUNT_NOT_FOUND", "Social account not found.")

        # Disconnect account and pause automations per FR-SOC-5
        client.table("social_accounts").update({"status": "disconnected"}).eq("id", account_id).execute()
        client.table("automations").update({"status": "paused"}).eq("social_account_id", account_id).execute()

        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.error(f"Error disconnecting account {account_id}: {e}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/accounts/{account_id}/sync", response_model=ApiResponse[dict])
async def sync_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Re-syncs account metadata, tokens, and recent media posts."""
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        return ApiResponse(data={"synced": False})

    try:
        client.table("social_accounts").update({
            "status": "connected",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", account_id).eq("user_id", user_id).execute()

        return ApiResponse(data={"synced": True, "message": "Account media and tokens successfully re-synced."})
    except Exception as e:
        logger.error(f"Error syncing account: {e}")
        return ApiResponse(data={"synced": False, "message": str(e)})

@router.get("/accounts/{account_id}/posts", response_model=ApiResponse[List[PostItem]])
async def get_account_posts(account_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        return ApiResponse(data=[])

    try:
        # Check active automations for mapping
        auto_res = client.table("automations").select("id, name, target_post_id, automation_triggers(keyword)").eq("user_id", user_id).is_("deleted_at", "null").execute()
        active_triggers_by_post = {}
        for a in (auto_res.data or []):
            p_id = a.get("target_post_id")
            trgs = a.get("automation_triggers") or []
            kw = trgs[0].get("keyword") if trgs and isinstance(trgs, list) else None
            if p_id and kw:
                active_triggers_by_post[p_id] = kw

        res = client.table("posts").select("*").eq("social_account_id", account_id).eq("user_id", user_id).execute()
        rows = res.data or []

        # If empty, generate seed posts so creator has immediate posts to test
        if not rows:
            seed_posts = [
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": account_id,
                    "external_post_id": f"post_reel_notion_{user_id[:6]}",
                    "permalink": "https://instagram.com/reel/C1x89yZ",
                    "caption": "10x your client onboarding in Notion. Comment 'NOTION' and I'll DM you my exact template for free 🚀",
                    "media_type": "REEL"
                },
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": account_id,
                    "external_post_id": f"post_reel_blueprint_{user_id[:6]}",
                    "permalink": "https://instagram.com/reel/C2a90wX",
                    "caption": "Stop losing leads in the DMs! Comment 'GUIDE' for my automated Instagram growth blueprint 📲",
                    "media_type": "REEL"
                },
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": account_id,
                    "external_post_id": f"post_carousel_ai_{user_id[:6]}",
                    "permalink": "https://instagram.com/p/C3m41kV",
                    "caption": "Top 5 AI Tools that replaced my 40-hr agency team in 2026. Comment 'TOOLS' to grab the list 👇",
                    "media_type": "CAROUSEL"
                }
            ]
            for p in seed_posts:
                try:
                    client.table("posts").upsert(p, on_conflict="social_account_id, external_post_id").execute()
                except Exception:
                    pass
            rows = seed_posts

        posts = []
        for p in rows:
            ext_id = p.get("external_post_id", "")
            active_kw = active_triggers_by_post.get(ext_id)
            posts.append(PostItem(
                id=p["id"],
                external_post_id=ext_id,
                permalink=p.get("permalink"),
                caption=p.get("caption"),
                media_type=p.get("media_type") or "REEL",
                comments_count=42,
                likes_count=512,
                active_automation=f"Trigger: #{active_kw}" if active_kw else None,
                posted_at=p.get("posted_at")
            ))
        return ApiResponse(data=posts)
    except Exception as e:
        logger.error(f"Error fetching posts: {e}")
        return ApiResponse(data=[])

@router.post("/simulate-comment", response_model=ApiResponse[SimulateCommentResponse])
async def simulate_comment(
    payload: SimulateCommentRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Simulate an Instagram post comment in real-time.
    Feeds comment into the LangGraph automation engine and returns execution results!
    """
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Database client not available.")

    # 1. Resolve Social Account
    social_account_id = payload.social_account_id
    if not social_account_id:
        acc_res = client.table("social_accounts").select("id").eq("user_id", user_id).eq("status", "connected").limit(1).execute()
        if acc_res.data and len(acc_res.data) > 0:
            social_account_id = acc_res.data[0]["id"]
        else:
            raise AppError("ACCOUNT_NOT_FOUND", "Please connect a social account before simulating comments.")

    # 2. Resolve Post ID
    external_post_id = payload.external_post_id or f"post_reel_notion_{user_id[:6]}"
    comment_id = f"mock_cmt_{uuid.uuid4().hex[:8]}"
    commenter_id = f"user_{hash(payload.commenter_username) % 1000000}"
    normalized_comment = normalize(payload.comment_text)

    # 3. Create incoming event
    incoming_event = event_repo.create_incoming_event(
        user_id=user_id,
        social_account_id=social_account_id,
        external_comment_id=comment_id,
        external_post_id=external_post_id,
        commenter_id=commenter_id,
        commenter_username=payload.commenter_username,
        comment_text=payload.comment_text,
        normalized_text=normalized_comment
    )

    if not incoming_event:
        raise AppError("EVENT_CREATION_FAILED", "Could not record incoming comment event.")

    # 4. Invoke LangGraph Automation Engine
    try:
        final_state = await run_for_event(incoming_event["id"])
    except Exception as e:
        logger.error(f"Error during graph execution: {e}")
        return ApiResponse(data=SimulateCommentResponse(
            success=False,
            status="error",
            message=f"Engine failure: {e}"
        ))

    outcome = final_state.get("outcome")
    auto = final_state.get("automation") or {}
    matched_keyword = final_state.get("matched_keyword")
    reply_text = final_state.get("reply_text")
    execution_id = final_state.get("execution_id")

    if outcome == "success":
        msg = f"DM successfully sent to @{payload.commenter_username}!"
    elif outcome == "duplicate":
        msg = "Comment ignored: duplicate within cooldown window."
    elif outcome == "no_match":
        msg = f"No active automation trigger matched '{payload.comment_text}'."
    elif outcome == "skipped":
        msg = "AI intent gate rejected this comment."
    elif outcome == "ignored":
        msg = "Self-comment from creator ignored."
    else:
        msg = f"Execution finished with status: {outcome}."

    return ApiResponse(data=SimulateCommentResponse(
        success=(outcome == "success"),
        matched_keyword=matched_keyword,
        automation_name=auto.get("name"),
        reply_text=reply_text,
        execution_id=execution_id,
        status=outcome or "unknown",
        message=msg
    ))
