import hmac
import hashlib
import time
from typing import Any, Dict
import jwt
from cryptography.fernet import Fernet
from app.core.config import settings
from app.core.errors import UnauthorizedError

_fernet_instance: Fernet | None = None

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
    """Verify Supabase JWT and extract payload. Raises UnauthorizedError on failure."""
    if not token:
        raise UnauthorizedError("Missing authentication token.")

    try:
        # If secret is provided, verify signature
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_exp": True}
            )
        else:
            # Allow fallback in local test mode only if explicitly APP_ENV=test
            if settings.APP_ENV == "test":
                payload = jwt.decode(token, options={"verify_signature": False})
            else:
                raise UnauthorizedError("SUPABASE_JWT_SECRET not configured on server.")

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
