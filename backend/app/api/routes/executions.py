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

class ExecutionStats(BaseModel):
    total_executions: int
    success_count: int
    failed_count: int
    pending_count: int
    total_events: int
    success_rate: float

class IncomingEventListItem(BaseModel):
    id: str
    event_type: str
    commenter_username: str
    commenter_id: Optional[str] = None
    comment_text: str
    external_post_id: Optional[str] = None
    account_username: Optional[str] = None
    created_at: Optional[datetime] = None
    matched_execution_id: Optional[str] = None
    execution_status: Optional[str] = None

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

@router.get("/stats", response_model=ApiResponse[ExecutionStats])
async def get_execution_stats(current_user: dict = Depends(get_current_user)):
    from app.core.db import get_supabase_client
    client = get_supabase_client()
    if not client:
        return ApiResponse(data=ExecutionStats(
            total_executions=0, success_count=0, failed_count=0, pending_count=0, total_events=0, success_rate=100.0
        ))

    user_id = current_user["id"]
    try:
        total = client.table("executions").select("id", count="exact").eq("user_id", user_id).execute().count or 0
        success = client.table("executions").select("id", count="exact").eq("user_id", user_id).eq("status", "success").execute().count or 0
        failed = client.table("executions").select("id", count="exact").eq("user_id", user_id).eq("status", "failed").execute().count or 0
        pending = client.table("executions").select("id", count="exact").eq("user_id", user_id).in_("status", ["pending", "sending"]).execute().count or 0
        events = client.table("incoming_events").select("id", count="exact").eq("user_id", user_id).execute().count or 0
        rate = round((success / total * 100.0), 1) if total > 0 else 100.0

        return ApiResponse(data=ExecutionStats(
            total_executions=total,
            success_count=success,
            failed_count=failed,
            pending_count=pending,
            total_events=events,
            success_rate=rate,
        ))
    except Exception as e:
        logger.error(f"Error fetching execution stats: {e}")
        return ApiResponse(data=ExecutionStats(
            total_executions=0, success_count=0, failed_count=0, pending_count=0, total_events=0, success_rate=100.0
        ))

@router.get("/events", response_model=ApiResponse[List[IncomingEventListItem]])
async def list_incoming_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    from app.core.db import get_supabase_client
    client = get_supabase_client()
    if not client:
        return ApiResponse(data=[], meta=MetaPagination(page=page, page_size=page_size, total=0))

    try:
        offset = (page - 1) * page_size
        res = client.table("incoming_events").select(
            "*, social_accounts(username), executions(id, status)",
            count="exact"
        ).eq("user_id", current_user["id"]).order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

        events_data = res.data or []
        total = res.count or len(events_data)

        items = []
        for ev in events_data:
            acc = ev.get("social_accounts") or {}
            exec_list = ev.get("executions") or []
            first_exec = exec_list[0] if (exec_list and isinstance(exec_list, list)) else None

            items.append(IncomingEventListItem(
                id=ev["id"],
                event_type=ev.get("event_type", "comment"),
                commenter_username=ev.get("commenter_username", "unknown"),
                commenter_id=ev.get("commenter_id"),
                comment_text=ev.get("comment_text", ""),
                external_post_id=ev.get("external_post_id"),
                account_username=acc.get("username"),
                created_at=ev.get("created_at"),
                matched_execution_id=first_exec.get("id") if first_exec else None,
                execution_status=first_exec.get("status") if first_exec else None,
            ))

        return ApiResponse(
            data=items,
            meta=MetaPagination(page=page, page_size=page_size, total=total)
        )
    except Exception as e:
        logger.error(f"Error fetching incoming events: {e}")
        return ApiResponse(data=[], meta=MetaPagination(page=page, page_size=page_size, total=0))

@router.get("/{execution_id}", response_model=ApiResponse[Dict[str, Any]])
async def get_execution_detail(execution_id: str, current_user: dict = Depends(get_current_user)):
    row = execution_repo.get_by_id(execution_id)
    if not row or str(row.get("user_id")) != str(current_user["id"]):
        raise NotFoundError("EXECUTION_NOT_FOUND", "Execution record not found.")

    steps = step_repo.get_steps_for_execution(execution_id, row.get("incoming_event_id"))
    row["steps"] = steps
    return ApiResponse(data=row)

@router.get("/{execution_id}/steps", response_model=ApiResponse[List[StepTraceItem]])
async def get_execution_steps(execution_id: str, current_user: dict = Depends(get_current_user)):
    row = execution_repo.get_by_id(execution_id)
    if not row or str(row.get("user_id")) != str(current_user["id"]):
        raise NotFoundError("EXECUTION_NOT_FOUND", "Execution record not found.")

    steps = step_repo.get_steps_for_execution(execution_id, row.get("incoming_event_id"))
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
