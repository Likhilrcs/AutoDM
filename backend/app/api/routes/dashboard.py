from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_current_user
from app.core.db import get_supabase_client
from app.schemas.common import ApiResponse
from app.utils.logger import logger

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

class RecentActivityItem(BaseModel):
    id: str
    commenter_username: str
    comment_text: str
    trigger_keyword: str
    automation_name: str
    dm_status: str # 'sent', 'failed', 'queued'
    created_at: Optional[datetime] = None

class ActiveCampaignItem(BaseModel):
    id: str
    name: str
    trigger_keyword: str
    target_post_id: Optional[str] = None
    status: str
    dms_sent: int = 0

class ConnectedAccountSummary(BaseModel):
    id: Optional[str] = None
    username: Optional[str] = None
    status: str = "disconnected"
    followers_count: int = 0

class DashboardSummaryResponse(BaseModel):
    total_automations: int = 0
    active_automations: int = 0
    total_comments: int = 0
    total_dms: int = 0
    successful_dms: int = 0
    failed_dms: int = 0
    success_rate: float = 100.0
    connected_account: Optional[ConnectedAccountSummary] = None
    active_campaigns: List[ActiveCampaignItem] = []
    recent_activity: List[RecentActivityItem] = []

@router.get("/summary", response_model=ApiResponse[DashboardSummaryResponse])
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    client = get_supabase_client()

    summary = DashboardSummaryResponse()
    if not client:
        return ApiResponse(data=summary)

    # 1. Connected Account Summary
    try:
        acc_res = client.table("social_accounts").select("id, username, status").eq("user_id", user_id).limit(1).execute()
        if acc_res.data and len(acc_res.data) > 0:
            row = acc_res.data[0]
            summary.connected_account = ConnectedAccountSummary(
                id=row["id"],
                username=row.get("username") or "creator",
                status=row.get("status") or "connected",
                followers_count=0
            )
    except Exception as e:
        logger.error(f"Error fetching connected account for dashboard: {e}")

    # 2. Automations counts and active campaigns
    automations = []
    try:
        auto_res = client.table("automations").select(
            "id, name, external_post_id, post_url, status, automation_triggers(keyword)"
        ).eq("user_id", user_id).is_("deleted_at", "null").execute()
        automations = auto_res.data or []
        summary.total_automations = len(automations)
        summary.active_automations = sum(1 for a in automations if a.get("status") == "active")
    except Exception as e:
        logger.error(f"Error fetching automations for dashboard: {e}")

    # 3. Total comments received
    try:
        comm_res = client.table("incoming_events").select("id", count="exact").eq("user_id", user_id).execute()
        summary.total_comments = comm_res.count or 0
    except Exception as e:
        logger.error(f"Error fetching comments count for dashboard: {e}")

    # 4. Executions / DMs counts
    executions = []
    try:
        exec_res = client.table("executions").select("id, status, automation_id").eq("user_id", user_id).execute()
        executions = exec_res.data or []
        summary.total_dms = len(executions)
        summary.successful_dms = sum(1 for e in executions if e.get("status") == "success")
        summary.failed_dms = sum(1 for e in executions if e.get("status") == "failed")
        if summary.total_dms > 0:
            summary.success_rate = round((summary.successful_dms / summary.total_dms) * 100, 1)
        else:
            summary.success_rate = 100.0

        # Build campaign stats
        exec_by_auto: Dict[str, int] = {}
        for e in executions:
            aid = e.get("automation_id")
            if aid and e.get("status") == "success":
                exec_by_auto[aid] = exec_by_auto.get(aid, 0) + 1

        campaigns = []
        for a in automations:
            if a.get("status") == "active":
                trgs = a.get("automation_triggers") or []
                kw = trgs[0].get("keyword") if trgs and isinstance(trgs, list) else (trgs.get("keyword") if isinstance(trgs, dict) else "link")
                campaigns.append(ActiveCampaignItem(
                    id=a["id"],
                    name=a["name"],
                    trigger_keyword=kw or "link",
                    target_post_id=a.get("external_post_id") or a.get("post_url"),
                    status=a["status"],
                    dms_sent=exec_by_auto.get(a["id"], 0)
                ))
        summary.active_campaigns = campaigns[:4]
    except Exception as e:
        logger.error(f"Error fetching executions for dashboard: {e}")

    # 5. Recent activity
    try:
        rec_res = client.table("executions").select(
            "id, status, created_at, automations(name, automation_triggers(keyword)), incoming_events(comment_text, commenter_username)",
        ).eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()

        recent_items = []
        for row in (rec_res.data or []):
            auto = row.get("automations") or {}
            event = row.get("incoming_events") or {}
            triggers = auto.get("automation_triggers") or []
            trg_keyword = triggers[0].get("keyword") if triggers and isinstance(triggers, list) else (triggers.get("keyword") if isinstance(triggers, dict) else "keyword")

            dm_status = "sent" if row.get("status") == "success" else ("failed" if row.get("status") == "failed" else "queued")

            recent_items.append(RecentActivityItem(
                id=row["id"],
                commenter_username=event.get("commenter_username") or "user",
                comment_text=event.get("comment_text") or "comment",
                trigger_keyword=trg_keyword or "link",
                automation_name=auto.get("name") or "Automation",
                dm_status=dm_status,
                created_at=row.get("created_at")
            ))

        summary.recent_activity = recent_items
    except Exception as e:
        logger.error(f"Error fetching recent activity for dashboard: {e}")

    return ApiResponse(data=summary)
