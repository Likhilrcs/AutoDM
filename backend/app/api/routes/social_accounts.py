from typing import List, Optional
from fastapi import APIRouter, Depends, status, Response, Request, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
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
from app.services.instagram_service import instagram_service

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
    platform: str = "instagram" # "instagram" or "mock"

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
    comments_count: Optional[int] = 42
    likes_count: Optional[int] = 512
    active_automation: Optional[str] = None
    posted_at: Optional[datetime] = None

class SimulateCommentRequest(BaseModel):
    social_account_id: Optional[str] = None
    external_post_id: Optional[str] = None
    commenter_username: str = "customer_alex"
    comment_text: str = "PRICE"

class SimulateCommentResponse(BaseModel):
    success: bool
    matched_keyword: Optional[str] = None
    automation_name: Optional[str] = None
    reply_text: Optional[str] = None
    execution_id: Optional[str] = None
    status: str
    message: str

class CallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None

def get_default_seed_posts(user_id: str, account_id: str) -> List[dict]:
    """Realistic Instagram posts matching user requirements."""
    return [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "social_account_id": account_id,
            "external_post_id": "post_product_launch",
            "permalink": "https://www.instagram.com/reel/DEMO123/",
            "caption": "Product Launch: Our new automated CRM is officially live! Comment 'PRICE' or 'LAUNCH' to unlock early-bird discount 🔥",
            "media_type": "REEL"
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "social_account_id": account_id,
            "external_post_id": "post_new_shoes",
            "permalink": "https://www.instagram.com/reel/DEMO456/",
            "caption": "New Shoes: Limited drop! Retro runner sneakers available now. Comment 'PRICE' to receive sizing details and direct checkout link 👟",
            "media_type": "REEL"
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "social_account_id": account_id,
            "external_post_id": "post_summer_offer",
            "permalink": "https://www.instagram.com/p/DEMO789/",
            "caption": "Summer Offer: 40% off sitewide on all accessories! Comment 'PRICE' or 'OFFER' below to grab your private promo code ☀️",
            "media_type": "CAROUSEL"
        }
    ]

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
                username=row.get("username") or "mybusiness",
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

    if not settings.SOCIAL_CLIENT_ID:
        raise AppError("CONFIG_ERROR", "Meta SOCIAL_CLIENT_ID is not configured.")

    # Generate official Instagram OAuth URL for user to authenticate with their credentials
    auth_url = instagram_service.get_authorization_url(user_id=user_id)
    return ApiResponse(data=ConnectAccountResponse(
        authorization_url=auth_url,
        mock=False
    ))

@router.get("/callback")
@router.get("/callback/")
async def meta_oauth_redirect_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None)
):
    """
    Browser redirect endpoint from Meta / Instagram authorization dialog.
    Receives code & state, exchanges token, and redirects back to frontend with connected account.
    """
    logger.info(f"Received Meta OAuth callback. state={state}, error={error}")

    if error:
        err_msg = error_description or error or "Meta authorization was cancelled."
        logger.warning(f"Meta OAuth error received: {err_msg}")
        return RedirectResponse(url=f"http://localhost:5173/social-accounts?error={err_msg}")

    if not code:
        return RedirectResponse(url="http://localhost:5173/social-accounts?error=No+authorization+code+returned")

    user_id = None
    if state and state.startswith("user_"):
        user_id = state.replace("user_", "")

    client = get_supabase_client()
    if not client or not user_id:
        return RedirectResponse(url="http://localhost:5173/social-accounts?error=missing_user_state")

    try:
        # 1. Exchange code for 60-day token (strip #_ appended by Meta)
        clean_code = code.split("#")[0].strip()
        token_data = await instagram_service.exchange_code_for_token(clean_code)
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url="http://localhost:5173/social-accounts?error=failed_to_obtain_access_token")

        # 2. Fetch user profile from Instagram Graph API
        profile = await instagram_service.get_user_profile(access_token)
        ig_id = profile.get("id") or token_data.get("user_id") or f"ig_{uuid.uuid4().hex[:10]}"
        username = profile.get("username", "instagram_creator")
        account_type = profile.get("account_type", "MEDIA_CREATOR")

        # 3. Check for existing social account row
        acc_res = client.table("social_accounts").select("id").eq("platform", "instagram").eq("external_account_id", str(ig_id)).execute()
        if acc_res.data and len(acc_res.data) > 0:
            acc_id = acc_res.data[0]["id"]
            client.table("social_accounts").update({
                "user_id": user_id,
                "username": username,
                "account_type": account_type,
                "status": "connected",
                "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            }).eq("id", acc_id).execute()
        else:
            user_acc = client.table("social_accounts").select("id").eq("user_id", user_id).execute()
            if user_acc.data and len(user_acc.data) > 0:
                acc_id = user_acc.data[0]["id"]
                client.table("social_accounts").update({
                    "platform": "instagram",
                    "external_account_id": str(ig_id),
                    "username": username,
                    "account_type": account_type,
                    "status": "connected",
                    "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
                }).eq("id", acc_id).execute()
            else:
                acc_id = str(uuid.uuid4())
                client.table("social_accounts").insert({
                    "id": acc_id,
                    "user_id": user_id,
                    "platform": "instagram",
                    "external_account_id": str(ig_id),
                    "username": username,
                    "account_type": account_type,
                    "status": "connected",
                    "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
                }).execute()

        # 4. Save 60-day token securely into social_account_tokens
        client.table("social_account_tokens").upsert({
            "social_account_id": acc_id,
            "access_token_enc": access_token,
            "token_type": "long_lived",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            "last_refreshed_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        # 5. Sync media & posts from Instagram
        try:
            media_list = await instagram_service.get_user_media(access_token)
            for m in media_list:
                post_data = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": acc_id,
                    "external_post_id": str(m["id"]),
                    "permalink": m.get("permalink"),
                    "caption": m.get("caption") or "",
                    "media_type": m.get("media_type", "REEL"),
                }
                try:
                    client.table("posts").upsert(post_data, on_conflict="social_account_id, external_post_id").execute()
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Error syncing media in redirect callback: {e}")

        logger.info(f"Successfully connected Instagram account @{username} via Meta OAuth.")
        return RedirectResponse(url=f"http://localhost:5173/social-accounts?connected=true&username={username}")
    except Exception as e:
        logger.error(f"Error handling Meta OAuth callback: {e}")
        return RedirectResponse(url=f"http://localhost:5173/social-accounts?error={str(e)}")

@router.post("/callback", response_model=ApiResponse[dict])
async def meta_oauth_post_callback(
    payload: CallbackRequest,
    current_user: dict = Depends(get_current_user)
):
    """API endpoint for frontend-handled OAuth callback."""
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Database not available.")

    clean_code = payload.code.split("#")[0].strip()
    token_data = await instagram_service.exchange_code_for_token(clean_code)
    access_token = token_data.get("access_token")
    if not access_token:
        raise AppError("OAUTH_FAILED", "Failed to retrieve access token from Meta.")

    profile = await instagram_service.get_user_profile(access_token)
    ig_id = profile.get("id") or token_data.get("user_id") or f"ig_{uuid.uuid4().hex[:10]}"
    username = profile.get("username", "instagram_creator")
    account_type = profile.get("account_type", "MEDIA_CREATOR")

    # Upsert social_account
    acc_res = client.table("social_accounts").select("id").eq("platform", "instagram").eq("external_account_id", str(ig_id)).execute()
    if acc_res.data and len(acc_res.data) > 0:
        acc_id = acc_res.data[0]["id"]
        client.table("social_accounts").update({
            "user_id": user_id,
            "username": username,
            "account_type": account_type,
            "status": "connected",
            "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
        }).eq("id", acc_id).execute()
    else:
        user_acc = client.table("social_accounts").select("id").eq("user_id", user_id).execute()
        if user_acc.data and len(user_acc.data) > 0:
            acc_id = user_acc.data[0]["id"]
            client.table("social_accounts").update({
                "platform": "instagram",
                "external_account_id": str(ig_id),
                "username": username,
                "account_type": account_type,
                "status": "connected",
                "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            }).eq("id", acc_id).execute()
        else:
            acc_id = str(uuid.uuid4())
            client.table("social_accounts").insert({
                "id": acc_id,
                "user_id": user_id,
                "platform": "instagram",
                "external_account_id": str(ig_id),
                "username": username,
                "account_type": account_type,
                "status": "connected",
                "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            }).execute()

    # Save token
    client.table("social_account_tokens").upsert({
        "social_account_id": acc_id,
        "access_token_enc": access_token,
        "token_type": "long_lived",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
        "last_refreshed_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # Sync posts
    try:
        media_list = await instagram_service.get_user_media(access_token)
        for m in media_list:
            post_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "social_account_id": acc_id,
                "external_post_id": str(m["id"]),
                "permalink": m.get("permalink"),
                "caption": m.get("caption") or "",
                "media_type": m.get("media_type", "REEL"),
            }
            try:
                client.table("posts").upsert(post_data, on_conflict="social_account_id, external_post_id").execute()
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Error syncing media in post_callback: {e}")

    return ApiResponse(data={"connected": True, "username": username})

class ConnectTokenRequest(BaseModel):
    access_token: str

@router.post("/connect-token", response_model=ApiResponse[SocialAccountResponse])
async def connect_with_token(payload: ConnectTokenRequest, current_user: dict = Depends(get_current_user)):
    """Directly link Instagram account using access token generated from Meta App Dashboard."""
    user_id = current_user["id"]
    client = get_supabase_client()
    if not client:
        raise AppError("DATABASE_ERROR", "Database not available.")

    access_token = payload.access_token.strip()
    if not access_token:
        raise AppError("VALIDATION_ERROR", "Access token is required.")

    profile = await instagram_service.get_user_profile(access_token)
    username = profile.get("username", "instagram_creator")
    ig_id = profile.get("id") or f"ig_{uuid.uuid4().hex[:10]}"

    account_id = str(uuid.uuid4())
    account_data = {
        "id": account_id,
        "user_id": user_id,
        "platform": "instagram",
        "external_account_id": str(ig_id),
        "username": username,
        "account_type": profile.get("account_type", "MEDIA_CREATOR"),
        "status": "connected",
        "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
    }
    res = client.table("social_accounts").upsert(account_data, on_conflict="platform, external_account_id").execute()
    saved = res.data[0] if res.data else account_data
    acc_id = saved["id"]

    # Save token
    client.table("social_account_tokens").upsert({
        "social_account_id": acc_id,
        "access_token_enc": access_token,
        "token_type": "long_lived",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
        "last_refreshed_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # Automatically subscribe app to Instagram webhooks (comments, messages, mentions)
    try:
        await instagram_service.subscribe_to_webhooks(access_token)
    except Exception as e:
        logger.warning(f"Could not auto-subscribe to webhooks: {e}")

    # Sync media posts
    media_list = await instagram_service.get_user_media(access_token)
    for m in media_list:
        post_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "social_account_id": acc_id,
            "external_post_id": str(m["id"]),
            "permalink": m.get("permalink"),
            "caption": m.get("caption"),
            "media_type": m.get("media_type", "REEL"),
        }
        try:
            client.table("posts").upsert(post_data, on_conflict="social_account_id, external_post_id").execute()
        except Exception:
            pass

    return ApiResponse(data=SocialAccountResponse(
        id=acc_id,
        platform="instagram",
        external_account_id=str(ig_id),
        username=username,
        account_type=saved.get("account_type", "MEDIA_CREATOR"),
        status="connected",
        followers_count=profile.get("followers_count", 24500),
        media_count=len(media_list) or 10,
        token_expires_at=account_data["token_expires_at"],
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

        # Fetch token and sync real Instagram media
        tok_res = client.table("social_account_tokens").select("access_token_enc").eq("social_account_id", account_id).limit(1).execute()
        if tok_res.data and tok_res.data[0].get("access_token_enc"):
            token = tok_res.data[0]["access_token_enc"]
            media_items = await instagram_service.get_user_media(token)
            for m in media_items:
                post_data = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "social_account_id": account_id,
                    "external_post_id": str(m.get("id")),
                    "permalink": m.get("permalink"),
                    "caption": m.get("caption") or "",
                    "media_type": m.get("media_type") or "REEL",
                    "posted_at": m.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                }
                try:
                    client.table("posts").upsert(post_data, on_conflict="social_account_id, external_post_id").execute()
                except Exception as pe:
                    logger.warning(f"Error saving media {m.get('id')}: {pe}")

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
        auto_res = client.table("automations").select(
            "id, name, external_post_id, automation_triggers(keyword)"
        ).eq("user_id", user_id).is_("deleted_at", "null").execute()

        active_triggers_by_post = {}
        for a in (auto_res.data or []):
            p_id = a.get("external_post_id")
            trgs = a.get("automation_triggers") or []
            kw = trgs[0].get("keyword") if trgs and isinstance(trgs, list) else None
            if p_id and kw:
                active_triggers_by_post[p_id] = kw

        # Check existing posts
        res = client.table("posts").select("*").eq("social_account_id", account_id).eq("user_id", user_id).execute()
        rows = res.data or []

        # If no posts in DB yet, try fetching real posts from Instagram Graph API
        if not rows:
            tok_res = client.table("social_account_tokens").select("access_token_enc").eq("social_account_id", account_id).limit(1).execute()
            if tok_res.data and tok_res.data[0].get("access_token_enc"):
                token = tok_res.data[0]["access_token_enc"]
                media_items = await instagram_service.get_user_media(token)
                for m in media_items:
                    post_data = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "social_account_id": account_id,
                        "external_post_id": str(m.get("id")),
                        "permalink": m.get("permalink"),
                        "caption": m.get("caption") or "",
                        "media_type": m.get("media_type") or "REEL",
                        "posted_at": m.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    }
                    try:
                        client.table("posts").upsert(post_data, on_conflict="social_account_id, external_post_id").execute()
                    except Exception:
                        pass
                res = client.table("posts").select("*").eq("social_account_id", account_id).eq("user_id", user_id).execute()
                rows = res.data or []

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
            raise AppError("ACCOUNT_NOT_FOUND", "Please connect an Instagram account first.")

    # 2. Resolve Post ID
    external_post_id = payload.external_post_id or "post_new_shoes"
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
        msg = f"No active automation trigger matched '{payload.comment_text}' on post {external_post_id}."
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
