from typing import Dict, Any
from app.agents.state import AutomationState
from app.repositories.event_repository import event_repo
from app.utils.logger import logger

async def ingest_event(state: AutomationState) -> Dict[str, Any]:
    """Load incoming comment event; ignore self-comments from the connected account itself."""
    incoming_id = state.get("incoming_event_id")
    event = event_repo.get_incoming_event(incoming_id)

    if not event:
        logger.warning(f"Incoming event {incoming_id} not found in database.")
        return {"outcome": "ignored"}

    social_acc = event.get("social_accounts") or {}
    external_account_id = social_acc.get("external_account_id")

    # FR-TRG-4: Ignore comments authored by the connected account itself to prevent loops
    if event.get("commenter_id") == external_account_id:
        logger.info(f"Ignoring self-comment by account {external_account_id}")
        return {
            "user_id": event["user_id"],
            "social_account_id": event["social_account_id"],
            "external_post_id": event["external_post_id"],
            "comment_id": event["external_comment_id"],
            "commenter_id": event["commenter_id"],
            "comment_text": event["comment_text"],
            "outcome": "ignored",
        }

    return {
        "user_id": event["user_id"],
        "social_account_id": event["social_account_id"],
        "external_post_id": event["external_post_id"],
        "comment_id": event["external_comment_id"],
        "commenter_id": event["commenter_id"],
        "commenter_username": event.get("commenter_username", ""),
        "comment_text": event["comment_text"],
        "normalized_text": event.get("normalized_text", ""),
    }
