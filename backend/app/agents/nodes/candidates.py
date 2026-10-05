from typing import Dict, Any
from app.agents.state import AutomationState
from app.core.db import get_supabase_client
from app.utils.logger import logger

async def load_candidates(state: AutomationState) -> Dict[str, Any]:
    """Load active, non-deleted automations for the comment's social_account and post."""
    social_account_id = state.get("social_account_id")
    external_post_id = state.get("external_post_id")
    client = get_supabase_client()

    if not client:
        return {"candidates": []}

    try:
        res = client.table("automations").select(
            "*, automation_triggers(*)"
        ).eq("social_account_id", social_account_id).eq("external_post_id", external_post_id).eq(
            "status", "active"
        ).is_("deleted_at", "null").order("created_at").execute()

        candidates = res.data or []
        for c in candidates:
            trgs = c.get("automation_triggers") or []
            c["trigger"] = trgs[0] if (trgs and isinstance(trgs, list)) else trgs

        return {"candidates": candidates}
    except Exception as e:
        logger.error(f"Error loading candidate automations: {e}")
        return {"candidates": []}
