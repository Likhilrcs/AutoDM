import pytest
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

class SmokeState(TypedDict):
    message: str
    counter: int

def step_node(state: SmokeState) -> SmokeState:
    return {
        "message": f"{state['message']} -> processed",
        "counter": state["counter"] + 1
    }

@pytest.mark.asyncio
async def test_langgraph_smoke():
    builder = StateGraph(SmokeState)
    builder.add_node("step", step_node)
    builder.add_edge(START, "step")
    builder.add_edge("step", END)

    checkpointer = MemorySaver()
    graph = builder.compile(checkpointer=checkpointer)

    config = {"configurable": {"thread_id": "smoke-test-thread"}}
    result = await graph.ainvoke({"message": "hello", "counter": 0}, config)

    assert result["message"] == "hello -> processed"
    assert result["counter"] == 1

    # Verify checkpointer state
    state = await graph.aget_state(config)
    assert state.values["counter"] == 1
