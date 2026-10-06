import uuid
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.errors import (
    AppError,
    app_error_handler,
    validation_error_handler,
    generic_error_handler,
)
from app.utils.logger import logger
from app.api.routes import users, automations, auth, dashboard, social_accounts, executions, settings as settings_route, webhooks

def create_app() -> FastAPI:
    app = FastAPI(
        title="AutoDM API",
        version="1.0.0",
        description="Comment-to-DM automation SaaS backend powered by LangGraph and FastAPI",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Attach Request ID middleware
    @app.middleware("http")
    async def request_id_and_logging_middleware(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id
        start_time = time.perf_counter()

        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Inject X-Request-ID header
        response.headers["X-Request-ID"] = req_id

        # Skip spamming logs for health checks
        if request.url.path not in ["/health", "/api/v1/health"]:
            logger.info(
                f"{request.method} {request.url.path} -> {response.status_code} in {duration_ms:.2f}ms",
                extra={"request_id": req_id}
            )

        return response

    # CORS configuration
    cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
    if not cors_origins:
        cors_origins = ["http://localhost:5173"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Exception Handlers
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)

    # Base Health Check
    @app.get("/health", tags=["Health"])
    @app.get("/api/v1/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok",
            "app_env": settings.APP_ENV,
            "mock_social": settings.MOCK_SOCIAL_API,
            "mock_llm": settings.MOCK_LLM,
            "llm_provider": settings.LLM_PROVIDER,
        }

    # Meta Compliance Endpoints
    @app.get("/privacy", tags=["Legal"])
    async def privacy_policy():
        return {"policy": "AutoDM Privacy Policy - We do not sell or store personal data beyond automated messaging configuration."}

    @app.get("/terms", tags=["Legal"])
    async def terms_of_service():
        return {"terms": "AutoDM Terms of Service - Used for Instagram comment and DM automation."}

    @app.get("/deauthorize", tags=["Legal"])
    @app.post("/deauthorize", tags=["Legal"])
    async def deauthorize_callback():
        return {"status": "ok", "message": "Deauthorization acknowledged."}

    @app.get("/data-deletion", tags=["Legal"])
    @app.post("/data-deletion", tags=["Legal"])
    async def data_deletion_callback():
        return {
            "url": "https://recliner-filter-luxurious.ngrok-free.dev/privacy",
            "confirmation_code": "del_autodm_complete"
        }

    # API v1 routes
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(users.router, prefix="/api/v1")
    app.include_router(dashboard.router, prefix="/api/v1")
    app.include_router(automations.router, prefix="/api/v1")
    app.include_router(social_accounts.router, prefix="/api/v1")
    app.include_router(executions.router, prefix="/api/v1")
    app.include_router(settings_route.router, prefix="/api/v1")
    app.include_router(webhooks.router, prefix="/api/v1")

    # Direct root-level routes for Meta Webhook and OAuth callback compatibility
    app.include_router(webhooks.router)
    app.include_router(social_accounts.router)

    return app

app = create_app()
