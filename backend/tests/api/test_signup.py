import pytest
from unittest.mock import patch, MagicMock

def test_admin_signup_endpoint(client):
    payload = {
        "email": "brand_new_creator@autodm.dev",
        "password": "Password123!",
        "name": "Brand Creator"
    }

    mock_user = MagicMock()
    mock_user.id = "44444444-5555-6666-7777-888888888888"
    mock_user.email = payload["email"]

    mock_res = MagicMock()
    mock_res.user = mock_user

    with patch("app.api.routes.auth.get_supabase_client") as mock_db:
        mock_client = MagicMock()
        mock_client.auth.admin.create_user.return_value = mock_res
        mock_db.return_value = mock_client

        response = client.post("/api/v1/auth/signup", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["email"] == payload["email"]
        assert data["data"]["id"] == mock_user.id
