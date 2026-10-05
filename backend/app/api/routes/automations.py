from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, Response
from app.api.deps import get_current_user
from app.services.automation_service import automation_service
from app.schemas.common import ApiResponse, MetaPagination
from app.schemas.automation import (
    AutomationCreate,
    AutomationUpdate,
    AutomationResponse,
    AutomationListItem
)

router = APIRouter(prefix="/automations", tags=["Automations"])

@router.get("", response_model=ApiResponse[List[AutomationListItem]])
async def list_automations(
    status: Optional[str] = Query(None, description="Filter by status: draft, active, paused"),
    q: Optional[str] = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    items, total = automation_service.list_automations(
        user_id=current_user["id"],
        status=status,
        search=q,
        page=page,
        page_size=page_size
    )

    list_items = [
        AutomationListItem(
            id=item["id"],
            name=item["name"],
            keyword=item.get("keyword") or (item.get("trigger", {}).get("keyword") if item.get("trigger") else ""),
            post_url=item.get("post_url"),
            status=item["status"],
            reply_mode=item.get("reply_mode", "static"),
            executions=item.get("executions", 0),
            created_at=item.get("created_at")
        )
        for item in items
    ]

    return ApiResponse(
        data=list_items,
        meta=MetaPagination(page=page, page_size=page_size, total=total)
    )

@router.post("", status_code=status.HTTP_201_CREATED, response_model=ApiResponse[AutomationResponse])
async def create_automation(
    payload: AutomationCreate,
    current_user: dict = Depends(get_current_user)
):
    result = automation_service.create_automation(current_user["id"], payload)
    return ApiResponse(data=AutomationResponse(**result))

@router.get("/{automation_id}", response_model=ApiResponse[AutomationResponse])
async def get_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = automation_service.get_automation(current_user["id"], automation_id)
    return ApiResponse(data=AutomationResponse(**result))

@router.put("/{automation_id}", response_model=ApiResponse[AutomationResponse])
async def update_automation(
    automation_id: str,
    payload: AutomationUpdate,
    current_user: dict = Depends(get_current_user)
):
    result = automation_service.update_automation(current_user["id"], automation_id, payload)
    return ApiResponse(data=AutomationResponse(**result))

@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    automation_service.delete_automation(current_user["id"], automation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/{automation_id}/activate", response_model=ApiResponse[AutomationResponse])
async def activate_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = automation_service.activate_automation(current_user["id"], automation_id)
    return ApiResponse(data=AutomationResponse(**result))

@router.post("/{automation_id}/pause", response_model=ApiResponse[AutomationResponse])
async def pause_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = automation_service.pause_automation(current_user["id"], automation_id)
    return ApiResponse(data=AutomationResponse(**result))
