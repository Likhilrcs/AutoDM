from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import uuid
from app.core.db import get_supabase_client
from app.utils.logger import logger

class StepRepository:
    def record_step(
        self,
        user_id: str,
        incoming_event_id: str,
        execution_id: Optional[str],
        node: str,
        status: str,
        duration_ms: Optional[int] = None,
        summary: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None,
        llm_model: Optional[str] = None,
        tokens_in: Optional[int] = None,
        tokens_out: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return None

        data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "incoming_event_id": incoming_event_id,
            "execution_id": execution_id,
            "node": node,
            "status": status,
            "duration_ms": duration_ms,
            "summary": summary or {},
            "error_code": error_code,
            "llm_model": llm_model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "finished_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            res = client.table("execution_steps").insert(data).execute()
            return res.data[0] if res.data else data
        except Exception as e:
            logger.error(f"Error persisting execution step for node {node}: {e}")
            return None

    def get_steps_for_execution(self, execution_id: str) -> List[Dict[str, Any]]:
        client = get_supabase_client()
        if not client:
            return []
        try:
            res = client.table("execution_steps").select("*").eq("execution_id", execution_id).order("created_at").execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching steps for execution {execution_id}: {e}")
            return []

step_repo = StepRepository()
