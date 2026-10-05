import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Backend root directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(BACKEND_DIR / ".env"),
            str(BACKEND_DIR / ".ENV"),
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # --- App ---
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-to-a-secure-random-32-byte-string"
    TOKEN_ENCRYPTION_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:5173"

    # --- Supabase ---
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    DATABASE_URL: str = ""

    # --- Social Platform (Instagram) ---
    MOCK_SOCIAL_API: bool = True
    SOCIAL_CLIENT_ID: str = ""
    SOCIAL_CLIENT_SECRET: str = ""
    SOCIAL_REDIRECT_URI: str = "http://localhost:8000/api/v1/social/callback"
    WEBHOOK_VERIFY_TOKEN: str = "autodm_webhook_verify_token_secret"
    GRAPH_API_VERSION: str = "v21.0"

    # --- AI / LangChain / LangGraph ---
    MOCK_LLM: bool = False
    AI_ENABLED: bool = True
    LLM_PROVIDER: str = "groq"
    LLM_MODEL: str = "llama-3.1-8b-instant"
    GROQ_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    LLM_TIMEOUT_SECONDS: int = 8
    LLM_MAX_OUTPUT_TOKENS: int = 300
    AI_GATE_THRESHOLD: float = 0.6
    AI_DAILY_CALL_LIMIT: int = 50
    DM_MAX_CHARS: int = 1000

    LANGGRAPH_CHECKPOINT_DB_URL: str = ""
    GRAPH_RUN_TIMEOUT_SECONDS: int = 60
    STUCK_RUN_MINUTES: int = 5

    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: str | None = None
    LANGSMITH_PROJECT: str = "autodm-dev"

    # --- Tuning ---
    DM_MAX_ATTEMPTS: int = 3
    HTTP_TIMEOUT_SECONDS: int = 10

settings = Settings()
