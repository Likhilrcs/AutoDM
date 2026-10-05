import jwt
import time
from app.core.config import settings

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "mock_social" in data

def test_unauthenticated_request(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"
    assert "request_id" in data["error"]

def test_invalid_token(client):
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"

def test_authenticated_profile(client):
    # Construct a valid test token
    test_user_id = "11111111-2222-3333-4444-555555555555"
    payload = {
        "sub": test_user_id,
        "email": "tester@autodm.dev",
        "exp": int(time.time()) + 3600,
        "user_metadata": {"name": "Test Creator"}
    }
    
    # Sign with JWT secret if available, else HS256 dummy
    secret = settings.SUPABASE_JWT_SECRET or "test_secret"
    token = jwt.encode(payload, secret, algorithm="HS256")

    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == test_user_id
    assert data["data"]["email"] == "tester@autodm.dev"
