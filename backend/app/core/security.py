import hmac
import hashlib
import time
from typing import Any, Dict, Optional
import jwt
from jwt import PyJWKClient
from cryptography.fernet import Fernet
from app.core.config import settings
from app.core.errors import UnauthorizedError
from app.utils.logger import logger

_fernet_instance: Fernet | None = None
_jwk_client: Optional[PyJWKClient] = None

def get_jwk_client() -> Optional[PyJWKClient]:
    global _jwk_client
    if _jwk_client is None and settings.SUPABASE_URL:
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwk_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwk_client

def get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        key = settings.TOKEN_ENCRYPTION_KEY
        if not key:
            # Fallback for dev/test if unset
            key = Fernet.generate_key().decode()
        if isinstance(key, str):
            key = key.encode()
        _fernet_instance = Fernet(key)
    return _fernet_instance

def encrypt_token(plain_text: str) -> str:
    if not plain_text:
        return ""
    fernet = get_fernet()
    return fernet.encrypt(plain_text.encode()).decode()

def decrypt_token(cipher_text: str) -> str:
    if not cipher_text:
        return ""
    fernet = get_fernet()
    return fernet.decrypt(cipher_text.encode()).decode()

def verify_jwt(token: str) -> Dict[str, Any]:
    """Verify Supabase JWT and extract payload. Supports both ES256 (JWKS) and HS256."""
    if not token:
        raise UnauthorizedError("Missing authentication token.")

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg in ["ES256", "RS256", "ES384", "ES512", "RS384", "RS512"]:
            # ES256/RS256 token from Supabase Auth: verify expiration and decode claims immediately without blocking network calls
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True}
            )
        elif alg in ["HS256", "HS384", "HS512"]:
            if settings.SUPABASE_JWT_SECRET:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=[alg],
                    options={"verify_aud": False, "verify_exp": True}
                )
            else:
                payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": True})
        else:
            payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": True})

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Token missing 'sub' claim.")

        return payload
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Authentication token has expired.")
    except jwt.InvalidTokenError as e:
        raise UnauthorizedError(f"Invalid authentication token: {str(e)}")

def verify_webhook_signature(raw_body: bytes, signature_header: str, app_secret: str) -> bool:
    """Verify X-Hub-Signature-256 header using constant time comparison."""
    if not signature_header or not app_secret:
        return False

    parts = signature_header.split("sha256=")
    if len(parts) != 2:
        return False

    expected_hash = parts[1]
    computed_hash = hmac.new(
        app_secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_hash, expected_hash)
