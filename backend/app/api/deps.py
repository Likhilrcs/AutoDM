from typing import Any, Dict
from fastapi import Header
from app.core.security import verify_jwt
from app.core.errors import UnauthorizedError

async def get_current_user(authorization: str = Header(None)) -> Dict[str, Any]:
    """FastAPI dependency to extract and verify the Supabase JWT access token."""
    if not authorization:
        raise UnauthorizedError("Missing Authorization header.")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthorizedError("Invalid Authorization header format. Expected 'Bearer <token>'.")

    token = parts[1]
    payload = verify_jwt(token)
    user_id = payload.get("sub")
    email = payload.get("email", "")

    return {
        "id": user_id,
        "email": email,
        "payload": payload,
    }
