from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_current_user
from app.repositories.execution_repository import execution_repo
from app.repositories.step_repository import step_repo
from app.schemas.common import ApiResponse, MetaPagination
from app.core.errors import NotFoundError, AppError
from app.utils.logger import logger

router = APIRouter(prefix="/executions", tags=["Executions"])

class ExecutionListItem(BaseModel):
    id: str
    automation_id: str
    automation_name: str
    commenter_username: str
    comment_text: str
    status: str
    attempt_count: int = 0
    failure_code: Optional[str] = None
    created_at: Optional[datetime] = None

class StepTraceItem(BaseModel):
    node: str
    status: str
    duration_ms: Optional[int] = None
    llm_model: Optional[str] = None
    tokens_in: Optional[int] = None
    tokens_out: Optional[int] = None
    summary: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None

@router.get("", response_model=ApiResponse[List[ExecutionListItem]])
async def list_executions(
    status: Optional[str] = Query(None),
    automation_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    rows, total = execution_repo.list(
        user_id=current_user["id"],
        status=status,
        automation_id=automation_id,
        page=page,
        page_size=page_size
    )

    items = []
    for r in rows:
        auto = r.get("automations") or {}
        event = r.get("incoming_events") or {}
        items.append(ExecutionListItem(
            id=r["id"],
            automation_id=r["automation_id"],
            automation_name=auto.get("name") or "Automation",
            commenter_username=event.get("commenter_username") or "user",
            comment_text=event.get("comment_text") or "comment",
            status=r["status"],
            attempt_count=r.get("attempt_count", 0),
            failure_code=r.get("failure_code"),
            created_at=r.get("created_at")
        ))

    return ApiResponse(
        data=items,
        meta=MetaPagination(page=page, page_size=page_size, total=total)
    )

@router.get("/{execution_id}", response_model=ApiResponse[Dict[str, Any]])
async def get_execution_detail(execution_id: str, current_user: dict = Depends(get_current_user)):
    row = execution_repo.get_by_id(execution_id)
    if not row or str(row.get("user_id")) != str(current_user["id"]):
        raise NotFoundError("EXECUTION_NOT_FOUND", "Execution record not found.")

    steps = step_repo.get_steps_for_execution(execution_id)
    row["steps"] = steps
    return ApiResponse(data=row)

@router.get("/{execution_id}/steps", response_model=ApiResponse[List[StepTraceItem]])
async def get_execution_steps(execution_id: str, current_user: dict = Depends(get_current_user)):
    row = execution_repo.get_by_id(execution_id)
    if not row or str(row.get("user_id")) != str(current_user["id"]):
        raise NotFoundError("EXECUTION_NOT_FOUND", "Execution record not found.")

    steps = step_repo.get_steps_for_execution(execution_id)
    return ApiResponse(data=[StepTraceItem(**s) for s in steps])

@router.post("/{execution_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_execution(execution_id: str, current_user: dict = Depends(get_current_user)):
    row = execution_repo.get_by_id(execution_id)
    if not row or str(row.get("user_id")) != str(current_user["id"]):
        raise NotFoundError("EXECUTION_NOT_FOUND", "Execution record not found.")

    # Re-queue execution
    execution_repo.update_status(execution_id, status="pending", increment_attempts=True)
    logger.info(f"Manual retry initiated for execution {execution_id}")

    return {"success": True, "message": "Execution queued for retry."}
