import pytest
from unittest.mock import patch, MagicMock
from app.agents.graph import build_automation_graph, run_for_event, get_graph_mermaid
from langgraph.checkpoint.memory import MemorySaver

def test_mermaid_export():
    mermaid = get_graph_mermaid()
    assert mermaid is not None
    assert len(mermaid) > 20
    assert "ingest_event" in mermaid
    assert "match_keyword" in mermaid

@pytest.mark.asyncio
async def test_deterministic_graph_execution():
    test_event_id = "00000000-0000-0000-0000-000000000099"
    test_user_id = "11111111-2222-3333-4444-555555555555"

    fake_event = {
        "id": test_event_id,
        "user_id": test_user_id,
        "social_account_id": "acc-1",
        "external_post_id": "post-1",
        "external_comment_id": "comment-1",
        "commenter_id": "commenter-123",
        "commenter_username": "follower_alex",
        "comment_text": "Hey send me the GUIDE please!",
        "normalized_text": "hey send me the guide please",
        "social_accounts": {"external_account_id": "creator-acc"}
    }

    fake_candidate = {
        "id": "auto-123",
        "name": "Guide Delivery",
        "dm_message": "Here is your requested guide!",
        "link_url": "https://example.com/guide",
        "allow_repeat": False,
        "reply_mode": "static",
        "status": "active",
        "trigger": {
            "keyword": "guide",
            "match_mode": "contains",
            "case_sensitive": False
        }
    }

    fake_execution = {
        "id": "exec-abc-123",
        "status": "pending"
    }

    with patch("app.repositories.event_repository.event_repo.get_incoming_event", return_value=fake_event), \
         patch("app.agents.graph.load_candidates", return_value={"candidates": [fake_candidate]}), \
         patch("app.repositories.execution_repository.execution_repo.create_execution", return_value=fake_execution), \
         patch("app.repositories.execution_repository.execution_repo.update_status") as mock_status, \
         patch("app.repositories.step_repository.step_repo.record_step") as mock_step:

        # Compile fresh test graph
        graph = build_automation_graph(checkpointer=MemorySaver())

        config = {"configurable": {"thread_id": f"test_thread_{test_event_id}"}}
        result = await graph.ainvoke({"incoming_event_id": test_event_id}, config)

        assert result is not None
        assert result.get("automation")["name"] == "Guide Delivery"
        assert result.get("execution_id") == "exec-abc-123"
        assert result.get("reply_text") == "Here is your requested guide!\nhttps://example.com/guide"
        assert mock_step.called
