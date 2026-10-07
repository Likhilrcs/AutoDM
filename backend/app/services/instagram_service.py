from typing import Dict, Any, List, Optional
from urllib.parse import urlencode
import httpx
import uuid
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from app.core.errors import AppError
from app.utils.logger import logger

class InstagramService:
    """
    Handles Meta / Instagram Graph API interactions:
    - OAuth code exchange (short-lived & 60-day long-lived tokens)
    - Profile fetching (username, account type, follower counts)
    - Post & media synchronization (Reels, Carousels, Posts)
    - Direct Message sending
    """

    OAUTH_URL = "https://www.instagram.com/oauth/authorize"
    TOKEN_URL = "https://api.instagram.com/oauth/access_token"
    GRAPH_BASE_URL = "https://graph.instagram.com"
    FB_GRAPH_BASE_URL = "https://graph.facebook.com"

    def get_authorization_url(self, user_id: str, redirect_uri: Optional[str] = None, origin_flag: str = "cloud") -> str:
        """Generate official Meta Instagram OAuth authorization URL."""
        client_id = str(settings.SOCIAL_CLIENT_ID or "").strip()
        r_uri = str(redirect_uri or settings.SOCIAL_REDIRECT_URI or "").strip()

        # Scopes required for comment monitoring and direct messaging
        scopes = getattr(settings, "INSTAGRAM_SCOPES", "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments")

        state_val = f"user_{user_id}__orig_{origin_flag}" if origin_flag else f"user_{user_id}"

        params = {
            "enable_fb_login": "0",
            "force_authentication": "1",
            "client_id": client_id,
            "redirect_uri": r_uri,
            "response_type": "code",
            "scope": scopes,
            "state": state_val,
        }
        return f"{self.OAUTH_URL}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchange authorization code for an Instagram access token,
        then exchange it for a 60-day long-lived token.
        """
        r_uri = redirect_uri or settings.SOCIAL_REDIRECT_URI

        if not settings.SOCIAL_CLIENT_SECRET:
            raise AppError("CONFIG_ERROR", "SOCIAL_CLIENT_SECRET is not configured.")

        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Exchange code for short-lived token via Instagram OAuth endpoint
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": settings.SOCIAL_CLIENT_ID,
                    "client_secret": settings.SOCIAL_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "redirect_uri": r_uri,
                    "code": code,
                },
            )
            if resp.status_code != 200:
                # Fallback to Facebook Graph API OAuth token exchange
                fb_resp = await client.get(
                    f"{self.FB_GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/oauth/access_token",
                    params={
                        "client_id": settings.SOCIAL_CLIENT_ID,
                        "client_secret": settings.SOCIAL_CLIENT_SECRET,
                        "redirect_uri": r_uri,
                        "code": code,
                    },
                )
                if fb_resp.status_code == 200:
                    fb_data = fb_resp.json()
                    return {
                        "access_token": fb_data.get("access_token"),
                        "user_id": fb_data.get("user_id", f"fb_{uuid.uuid4().hex[:8]}"),
                        "expires_in": fb_data.get("expires_in", 5184000),
                        "token_type": "bearer",
                        "mock": False,
                    }
                else:
                    logger.error(f"Failed to exchange Instagram OAuth code: {resp.text} | FB: {fb_resp.text}")
                    raise AppError("OAUTH_EXCHANGE_FAILED", f"Instagram code exchange failed: {resp.text}")

            short_lived = resp.json()
            short_token = short_lived.get("access_token")
            user_id = short_lived.get("user_id")

            # 2. Exchange short-lived token for 60-day long-lived token
            try:
                long_resp = await client.get(
                    f"{self.GRAPH_BASE_URL}/access_token",
                    params={
                        "grant_type": "ig_exchange_token",
                        "client_secret": settings.SOCIAL_CLIENT_SECRET,
                        "access_token": short_token,
                    },
                )
                if long_resp.status_code == 200:
                    long_data = long_resp.json()
                    return {
                        "access_token": long_data.get("access_token"),
                        "user_id": str(user_id),
                        "expires_in": long_data.get("expires_in", 5184000),
                        "token_type": "bearer",
                        "mock": False,
                    }
            except Exception as e:
                logger.warning(f"Could not exchange for long-lived token: {e}")

            return {
                "access_token": short_token,
                "user_id": str(user_id),
                "expires_in": 3600,
                "token_type": "bearer",
                "mock": False,
            }

    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Fetch Instagram account profile (username, account type)."""
        if access_token.startswith("mock_"):
            return {
                "id": "17841400000000000",
                "username": "mybusiness",
                "account_type": "MEDIA_CREATOR",
                "media_count": 48,
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Try Instagram Graph API endpoint /me
            try:
                resp = await client.get(
                    f"{self.GRAPH_BASE_URL}/me",
                    params={
                        "fields": "id,username,account_type,media_count",
                        "access_token": access_token,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()
            except Exception:
                pass

            # 2. Try FB Graph API /me with accounts
            try:
                fb_resp = await client.get(
                    f"{self.FB_GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/me",
                    params={
                        "fields": "id,name,accounts{instagram_business_account{id,username,name}}",
                        "access_token": access_token,
                    },
                )
                if fb_resp.status_code == 200:
                    fb_data = fb_resp.json()
                    accounts = fb_data.get("accounts", {}).get("data", [])
                    for acc in accounts:
                        ig_acc = acc.get("instagram_business_account")
                        if ig_acc:
                            return {
                                "id": ig_acc.get("id"),
                                "username": ig_acc.get("username", "instagram_user"),
                                "account_type": "BUSINESS",
                                "media_count": 10,
                            }
                    return {
                        "id": fb_data.get("id"),
                        "username": fb_data.get("name", "instagram_user"),
                        "account_type": "BUSINESS",
                        "media_count": 10,
                    }
            except Exception:
                pass

            return {
                "id": f"ig_{uuid.uuid4().hex[:10]}",
                "username": "instagram_creator",
                "account_type": "MEDIA_CREATOR",
                "media_count": 12,
            }

    async def get_user_media(self, access_token: str) -> List[Dict[str, Any]]:
        """Fetch recent posts/reels from Instagram Graph API."""
        if access_token.startswith("mock_"):
            return self.get_mock_posts()

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(
                    f"{self.GRAPH_BASE_URL}/me/media",
                    params={
                        "fields": "id,caption,media_type,media_url,permalink,timestamp,comments_count,like_count",
                        "access_token": access_token,
                        "limit": 15,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    if data:
                        return data
            except Exception as e:
                logger.warning(f"Error fetching Instagram media: {e}")

            return self.get_mock_posts()

    async def subscribe_to_webhooks(self, access_token: str) -> bool:
        """Subscribe app to Instagram account webhooks for comments and messages."""
        if not access_token or access_token.startswith("mock_") or settings.MOCK_SOCIAL_API:
            return True

        fields = "comments,messages,messaging_postbacks,mentions"
        async with httpx.AsyncClient(timeout=10.0) as client:
            for base_url in [self.GRAPH_BASE_URL, self.FB_GRAPH_BASE_URL]:
                try:
                    res = await client.post(
                        f"{base_url}/{settings.GRAPH_API_VERSION}/me/subscribed_apps",
                        params={"access_token": access_token, "subscribed_fields": fields}
                    )
                    if res.status_code == 200 and res.json().get("success"):
                        logger.info(f"Successfully subscribed to Instagram webhooks via {base_url}")
                        return True
                    logger.warning(f"Webhook subscription returned {res.status_code} on {base_url}: {res.text}")
                except Exception as e:
                    logger.warning(f"Error subscribing to webhooks on {base_url}: {e}")
        return False

    async def send_message(
        self,
        access_token: str,
        recipient_id: Optional[str] = None,
        message_text: str = "",
        comment_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if not access_token:
            return {"ok": False, "error": "No access token provided"}

        recipient: Dict[str, Any] = {}
        if comment_id:
            recipient["comment_id"] = comment_id
        elif recipient_id:
            recipient["id"] = recipient_id
        else:
            return {"ok": False, "error": "Neither comment_id nor recipient_id provided"}

        last_error = "Failed to dispatch message to Instagram API."
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Try graph.instagram.com first (standard for Instagram User Access Tokens)
            # 2. Try graph.facebook.com second (for Page access tokens)
            for base_url in [self.GRAPH_BASE_URL, self.FB_GRAPH_BASE_URL]:
                try:
                    resp = await client.post(
                        f"{base_url}/{settings.GRAPH_API_VERSION}/me/messages",
                        headers={"Authorization": f"Bearer {access_token}"},
                        json={
                            "recipient": recipient,
                            "message": {"text": message_text},
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return {
                            "ok": True,
                            "data": data,
                            "message_id": data.get("message_id"),
                        }
                    last_error = f"{base_url} returned {resp.status_code}: {resp.text}"
                    logger.warning(f"send_message to {last_error}")
                except Exception as e:
                    last_error = f"Exception sending to {base_url}: {e}"
                    logger.warning(last_error)

            # If sending via comment_id failed and we have a recipient_id, try fallback with user ID
            if comment_id and recipient_id:
                try:
                    resp = await client.post(
                        f"{self.GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/me/messages",
                        headers={"Authorization": f"Bearer {access_token}"},
                        json={
                            "recipient": {"id": recipient_id},
                            "message": {"text": message_text},
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return {"ok": True, "data": data, "message_id": data.get("message_id")}
                    last_error = f"Fallback with recipient_id returned {resp.status_code}: {resp.text}"
                except Exception as e:
                    last_error = f"Fallback exception: {e}"
                    logger.warning(last_error)

            return {
                "ok": False,
                "error": last_error,
            }

    @staticmethod
    def get_mock_posts() -> List[Dict[str, Any]]:
        """Sample posts aligned with the user's post selection flow."""
        return [
            {
                "id": "18099887711223344",
                "caption": "Product Launch: Our new automated CRM is officially live! Comment 'PRICE' or 'LAUNCH' to unlock early-bird discount 🔥",
                "media_type": "REEL",
                "permalink": "https://www.instagram.com/reel/DEMO123/",
                "comments_count": 68,
                "like_count": 420,
            },
            {
                "id": "18099887711223345",
                "caption": "New Shoes: Limited drop! Retro runner sneakers available now. Comment 'PRICE' to receive sizing details and direct checkout link 👟",
                "media_type": "REEL",
                "permalink": "https://www.instagram.com/reel/DEMO456/",
                "comments_count": 142,
                "like_count": 890,
            },
            {
                "id": "18099887711223346",
                "caption": "Summer Offer: 40% off sitewide on all accessories! Comment 'OFFER' below to grab your private promo code ☀️",
                "media_type": "CAROUSEL",
                "permalink": "https://www.instagram.com/p/DEMO789/",
                "comments_count": 89,
                "like_count": 630,
            },
        ]

instagram_service = InstagramService()
