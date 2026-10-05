import os
import pytest
from fastapi.testclient import TestClient

# Ensure test mode for tests
os.environ["APP_ENV"] = "test"
os.environ["MOCK_SOCIAL_API"] = "true"
os.environ["MOCK_LLM"] = "true"

from app.main import app

@pytest.fixture
def client():
    return TestClient(app)
