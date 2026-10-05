from typing import Dict, Any
from app.agents.state import AutomationState
from app.repositories.execution_repository import execution_repo
from app.utils.logger import logger

async def create_execution(state: AutomationState) -> Dict[str, Any]:
    """
    Compute dedupe_key and insert execution row with DB unique constraint.
    Prevents race conditions and double-sends (FR-DUP-1..3).
    """
    auto = state.get("automation")
    if not auto:
        return {"outcome": "no_match"}

    automation_id = auto["id"]
    commenter_id = state.get("commenter_id", "")
    comment_id = state.get("comment_id", "")
    allow_repeat = auto.get("allow_repeat", False)

    # PRD §24.2 dedupe_key policy
    if allow_repeat:
        dedupe_key = f"{automation_id}:{commenter_id}:{comment_id}"
    else:
        dedupe_key = f"{automation_id}:{commenter_id}"

    user_id = state.get("user_id", "")
    incoming_event_id = state.get("incoming_event_id", "")
    thread_id = f"evt:{incoming_event_id}"

    execution = execution_repo.create_execution(
        user_id=user_id,
        automation_id=automation_id,
        incoming_event_id=incoming_event_id,
        dedupe_key=dedupe_key,
        thread_id=thread_id
    )

    if not execution:
        logger.info(f"Duplicate comment prevented for key: {dedupe_key}")
        return {
            "execution_id": None,
            "outcome": "duplicate",
        }

    return {
        "execution_id": execution["id"],
        "attempts": 0,
    }
