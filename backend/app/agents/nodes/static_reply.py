from typing import Dict, Any
from app.agents.state import AutomationState

async def render_static_reply(state: AutomationState) -> Dict[str, Any]:
    """Render the configured static message template and destination link."""
    auto = state.get("automation") or {}
    dm_msg = auto.get("dm_message", "")
    link_url = auto.get("link_url")

    if link_url:
        body = f"{dm_msg}\n{link_url}"
    else:
        body = dm_msg

    return {
        "reply_text": body,
        "generation_mode": "static",
    }
