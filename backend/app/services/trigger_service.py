from typing import Dict, Any, Optional
from app.agents.graph import run_for_event, get_graph_mermaid
from app.utils.logger import logger

class TriggerService:
    async def process_event(self, incoming_event_id: str, **ctx) -> Dict[str, Any]:
        """Dispatch comment event through compiled LangGraph automation graph."""
        logger.info(f"Starting LangGraph automation for incoming_event_id={incoming_event_id}")
        return await run_for_event(incoming_event_id, **ctx)

    def get_graph_definition(self) -> str:
        """Get Mermaid representation of compiled LangGraph."""
        return get_graph_mermaid()

trigger_service = TriggerService()
