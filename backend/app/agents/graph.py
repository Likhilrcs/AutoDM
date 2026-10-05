from typing import Optional, Dict, Any
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.agents.state import AutomationState
from app.agents.tracing import traced
from app.agents.routing import (
    entry_router,
    route_after_ingest,
    route_after_match,
    route_after_execution,
)
from app.agents.nodes.ingest import ingest_event
from app.agents.nodes.candidates import load_candidates
from app.agents.nodes.match import match_keyword
from app.agents.nodes.execution import create_execution
from app.agents.nodes.static_reply import render_static_reply
from app.agents.nodes.send_message import send_message
from app.agents.nodes.finalize import finalize

def build_automation_graph(checkpointer: Optional[Any] = None) -> Any:
    """Build and compile the LangGraph comment-to-DM automation graph."""
    if checkpointer is None:
        checkpointer = MemorySaver()

    builder = StateGraph(AutomationState)

    # Register nodes with traced() decorator for node-by-node execution_steps logging
    builder.add_node("ingest_event", traced("ingest_event", ingest_event))
    builder.add_node("load_candidates", traced("load_candidates", load_candidates))
    builder.add_node("match_keyword", traced("match_keyword", match_keyword))
    builder.add_node("create_execution", traced("create_execution", create_execution))
    builder.add_node("render_static_reply", traced("render_static_reply", render_static_reply))
    builder.add_node("send_message", traced("send_message", send_message))
    builder.add_node("finalize", traced("finalize", finalize))

    # Add edges and conditional routing
    builder.add_conditional_edges(
        START,
        entry_router,
        {"new": "ingest_event", "retry": "finalize"}
    )

    builder.add_conditional_edges(
        "ingest_event",
        route_after_ingest,
        {"continue": "load_candidates", "end": END}
    )

    builder.add_edge("load_candidates", "match_keyword")

    builder.add_conditional_edges(
        "match_keyword",
        route_after_match,
        {"continue": "create_execution", "end": END}
    )

    builder.add_conditional_edges(
        "create_execution",
        route_after_execution,
        {"continue": "render_static_reply", "end": END}
    )

    builder.add_edge("render_static_reply", "send_message")
    builder.add_edge("send_message", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(checkpointer=checkpointer)

# Shared singleton graph compiled with memory saver
automation_graph = build_automation_graph()

async def run_for_event(incoming_event_id: str, **ctx) -> Dict[str, Any]:
    """Execute the automation graph for an incoming comment event."""
    config = {
        "configurable": {
            "thread_id": f"evt:{incoming_event_id}"
        },
        "recursion_limit": 25,
    }
    initial_state = {
        "incoming_event_id": incoming_event_id,
        **ctx
    }
    return await automation_graph.ainvoke(initial_state, config)

def get_graph_mermaid() -> str:
    """Return the Mermaid graph diagram for transparency / frontend viewer."""
    try:
        return automation_graph.get_graph().draw_mermaid()
    except Exception:
        return "graph TD; START --> ingest_event --> load_candidates --> match_keyword --> create_execution --> render_static_reply --> finalize --> END"
