from typing import Dict, Any
from app.agents.state import AutomationState
from app.repositories.execution_repository import execution_repo
from app.utils.logger import logger

async def finalize(state: AutomationState) -> Dict[str, Any]:
    """Update execution record with final status, attempt count, and failure reasons."""
    execution_id = state.get("execution_id")
    if not execution_id:
        return {}

    outcome = state.get("outcome")
    send_res = state.get("send_result") or {}

    if outcome == "skipped":
        status = "skipped"
        failure_code = "AI_INTENT_REJECTED"
        failure_reason = "Comment was rejected by AI intent classifier."
    elif send_res.get("ok"):
        status = "success"
        failure_code = None
        failure_reason = None
    else:
        status = "failed"
        failure_code = send_res.get("error_code") or "MESSAGE_SEND_FAILED"
        failure_reason = "Failed to deliver direct message via platform adapter."

    execution_repo.update_status(
        execution_id=execution_id,
        status=status,
        failure_code=failure_code,
        failure_reason=failure_reason
    )

    logger.info(
        f"Execution {execution_id} finalized with status={status}",
        extra={"execution_id": execution_id, "status": status}
    )

    return {
        "outcome": status,
    }
