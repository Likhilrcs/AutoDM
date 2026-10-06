import uuid
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel

class ErrorDetails(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = {}
    request_id: str

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetails

class AppError(Exception):
    def __init__(
        self,
        code: str = "INTERNAL_ERROR",
        message: str = "An unexpected error occurred.",
        http_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.http_status = http_status
        self.details = details or {}
        super().__init__(message)

class UnauthorizedError(AppError):
    def __init__(self, message: str = "Missing, invalid or expired authentication token.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            http_status=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )

class ForbiddenError(AppError):
    def __init__(self, message: str = "You do not have permission to access this resource.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            http_status=status.HTTP_403_FORBIDDEN,
            details=details,
        )

class NotFoundError(AppError):
    def __init__(self, code: str = "NOT_FOUND", message: str = "Resource not found.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=code,
            message=message,
            http_status=status.HTTP_404_NOT_FOUND,
            details=details,
        )

class ConflictError(AppError):
    def __init__(self, code: str = "CONFLICT", message: str = "Resource conflict detected.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=code,
            message=message,
            http_status=status.HTTP_409_CONFLICT,
            details=details,
        )

class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            http_status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )

class RateLimitError(AppError):
    def __init__(self, message: str = "Rate limit exceeded. Please try again later.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="RATE_LIMITED",
            message=message,
            http_status=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
        )

def get_request_id(request: Request) -> str:
    req_id = getattr(request.state, "request_id", None)
    if not req_id:
        req_id = f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id
    return req_id

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = get_request_id(request)
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request_id,
            },
        },
    )

async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = get_request_id(request)
    field_errors = {}
    for err in exc.errors():
        field = ".".join([str(loc) for loc in err["loc"] if loc != "body"])
        field_errors[field] = err["msg"]

    detail_str = "; ".join([f"{f}: {m}" for f, m in field_errors.items()]) if field_errors else ""
    error_message = f"Invalid parameters: {detail_str}" if detail_str else "Invalid request parameters."

    try:
        from app.utils.logger import logger
        logger.warning(f"Validation error on {request.method} {request.url.path}: {field_errors}")
    except Exception:
        pass

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": error_message,
                "details": field_errors,
                "request_id": request_id,
            },
        },
    )

async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = get_request_id(request)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal server error occurred.",
                "details": {},
                "request_id": request_id,
            },
        },
    )
