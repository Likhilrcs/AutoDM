import pytest
import jwt
import time
from unittest.mock import patch, MagicMock
from app.core.config import settings

def get_auth_headers(user_id="11111111-2222-3333-4444-555555555555"):
    payload = {
        "sub": user_id,
        "email": "creator@autodm.dev",
        "exp": int(time.time()) + 3600,
        "user_metadata": {"name": "Maya Creator"}
    }
    secret = settings.SUPABASE_JWT_SECRET or "test_secret"
    token = jwt.encode(payload, secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}

def test_create_automation_validation_invalid_url(client):
    headers = get_auth_headers()
    payload = {
        "name": "Invalid Link Automation",
        "social_account_id": "00000000-0000-0000-0000-000000000001",
        "external_post_id": "18012345678901234",
        "trigger": {
            "type": "comment_keyword",
            "keyword": "ebook",
            "match_mode": "contains",
            "case_sensitive": False
        },
        "dm_message": "Here is the link:",
        "link_url": "http://insecure-link.com", # Must be https://
        "status": "draft"
    }

    response = client.post("/api/v1/automations", json=payload, headers=headers)
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"

def test_create_automation_happy_path(client):
    headers = get_auth_headers()
    payload = {
        "name": "Free Ebook Automation",
        "social_account_id": "00000000-0000-0000-0000-000000000001",
        "external_post_id": "18012345678901234",
        "trigger": {
            "type": "comment_keyword",
            "keyword": "ebook",
            "match_mode": "contains",
            "case_sensitive": False
        },
        "dm_message": "Hey! Here is your free ebook: https://example.com/ebook",
        "link_url": "https://example.com/ebook",
        "status": "draft"
    }

    with patch("app.repositories.automation_repository.automation_repo.check_social_account_ownership", return_value=True), \
         patch("app.repositories.automation_repository.automation_repo.create") as mock_create:
        mock_create.return_value = {
            "id": "33333333-0000-0000-0000-000000000001",
            "name": payload["name"],
            "status": "draft",
            "trigger": payload["trigger"],
            "dm_message": payload["dm_message"],
            "link_url": payload["link_url"],
            "allow_repeat": False,
            "reply_mode": "static",
            "stats": {"executions": 0, "success": 0, "failed": 0},
            "created_at": "2026-10-01T12:00:00Z"
        }

        response = client.post("/api/v1/automations", json=payload, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Free Ebook Automation"
        assert data["data"]["status"] == "draft"

def test_activate_automation_conflict(client):
    headers = get_auth_headers()
    auto_id = "33333333-0000-0000-0000-000000000001"

    with patch("app.repositories.automation_repository.automation_repo.get_by_id") as mock_get, \
         patch("app.repositories.automation_repository.automation_repo.find_active_conflict", return_value=True):
        mock_get.return_value = {
            "id": auto_id,
            "name": "Ebook",
            "social_account_id": "acc-1",
            "external_post_id": "post-1",
            "trigger": {"keyword": "ebook", "keyword_normalized": "ebook"}
        }

        response = client.post(f"/api/v1/automations/{auto_id}/activate", headers=headers)
        assert response.status_code == 409
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "AUTOMATION_CONFLICT"
