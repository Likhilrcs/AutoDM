from typing import Dict, Any, List, Optional
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

    def get_authorization_url(self, user_id: str, redirect_uri: Optional[str] = None) -> str:
        """Generate official Meta Instagram OAuth authorization URL."""
        client_id = settings.SOCIAL_CLIENT_ID
        r_uri = redirect_uri or settings.SOCIAL_REDIRECT_URI

        # Scopes required for comment monitoring and direct messaging
        scopes = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments"

        return (
            f"{self.OAUTH_URL}?"
            f"enable_fb_login=0&"
            f"force_authentication=1&"
            f"client_id={client_id}&"
            f"redirect_uri={r_uri}&"
            f"response_type=code&"
            f"scope={scopes}&"
            f"state=user_{user_id}"
        )

    async def exchange_code_for_token(self, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """
        Exchange authorization code for an Instagram access token,
        then exchange it for a 60-day long-lived token.
        """
        r_uri = redirect_uri or settings.SOCIAL_REDIRECT_URI

        # In Mock mode or missing credentials, return simulated response
        if settings.MOCK_SOCIAL_API or not settings.SOCIAL_CLIENT_SECRET or code.startswith("mock_"):
            return {
                "access_token": f"mock_token_{uuid.uuid4().hex[:16]}",
                "user_id": f"ig_user_{uuid.uuid4().hex[:8]}",
                "expires_in": 5184000, # 60 days
                "token_type": "bearer",
                "mock": True,
            }

        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Exchange code for short-lived token
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
                logger.error(f"Failed to exchange Instagram OAuth code: {resp.text}")
                raise AppError("OAUTH_EXCHANGE_FAILED", f"Instagram code exchange failed: {resp.text}")

            short_lived = resp.json()
            short_token = short_lived.get("access_token")
            user_id = short_lived.get("user_id")

            # 2. Exchange short-lived token for 60-day long-lived token
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
            resp = await client.get(
                f"{self.GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/me",
                params={
                    "fields": "id,username,account_type,media_count",
                    "access_token": access_token,
                },
            )
            if resp.status_code != 200:
                logger.error(f"Failed to fetch Instagram profile: {resp.text}")
                raise AppError("PROFILE_FETCH_FAILED", "Could not fetch Instagram account profile.")

            return resp.json()

    async def get_user_media(self, access_token: str) -> List[Dict[str, Any]]:
        """Fetch recent posts/reels from Instagram Graph API."""
        if access_token.startswith("mock_"):
            return self.get_mock_posts()

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/me/media",
                params={
                    "fields": "id,caption,media_type,media_url,permalink,timestamp,comments_count,like_count",
                    "access_token": access_token,
                    "limit": 15,
                },
            )
            if resp.status_code != 200:
                logger.warning(f"Failed to fetch Instagram media: {resp.text}")
                return self.get_mock_posts()

            data = resp.json().get("data", [])
            return data

    async def send_message(self, access_token: str, recipient_id: str, message_text: str) -> Dict[str, Any]:
        """Send Direct Message response to an Instagram user."""
        if access_token.startswith("mock_") or settings.MOCK_SOCIAL_API:
            return {
                "ok": True,
                "recipient_id": recipient_id,
                "message_id": f"mock_msg_{uuid.uuid4().hex[:10]}",
            }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.FB_GRAPH_BASE_URL}/{settings.GRAPH_API_VERSION}/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                json={
                    "recipient": {"id": recipient_id},
                    "message": {"text": message_text},
                },
            )
            if resp.status_code != 200:
                logger.error(f"Failed to send Instagram DM: {resp.text}")
                return {
                    "ok": False,
                    "error": resp.text,
                    "status_code": resp.status_code,
                }

            return {
                "ok": True,
                "data": resp.json(),
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
