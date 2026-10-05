from typing import Dict, Any
from app.agents.state import AutomationState
from app.utils.text import normalize, matches
from app.utils.logger import logger

async def match_keyword(state: AutomationState) -> Dict[str, Any]:
    """
    Compare normalized comment text against candidate automations.
    Selects earliest created automation among matches.
    """
    comment_text = state.get("comment_text", "")
    candidates = state.get("candidates", [])

    matched_automation = None

    for candidate in candidates:
        trigger = candidate.get("trigger") or {}
        keyword = trigger.get("keyword", "")
        mode = trigger.get("match_mode", "contains")
        case_sensitive = trigger.get("case_sensitive", False)

        if matches(comment_text, keyword, mode, case_sensitive):
            matched_automation = candidate
            logger.info(
                f"Comment matched automation '{candidate.get('name')}' on keyword '{keyword}'"
            )
            break

    if not matched_automation:
        logger.info(f"Comment '{comment_text}' did not match any active automation.")
        return {
            "automation": None,
            "outcome": "no_match",
        }

    return {
        "automation": matched_automation,
        "matched_automation": matched_automation["id"],
    }
