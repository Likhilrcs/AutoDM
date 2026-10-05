import pytest
from app.agents.routing import (
    entry_router,
    route_after_ingest,
    route_after_match,
    route_after_execution,
    route_gate,
    route_reply_mode,
    route_after_validate,
    route_after_send,
)

def test_entry_router():
    assert entry_router({"resume_from": "send"}) == "retry"
    assert entry_router({"resume_from": "start"}) == "new"
    assert entry_router({}) == "new"

def test_route_after_ingest():
    assert route_after_ingest({"outcome": "ignored"}) == "end"
    assert route_after_ingest({"outcome": None}) == "continue"

def test_route_after_match():
    assert route_after_match({"automation": None}) == "end"
    assert route_after_match({"outcome": "no_match"}) == "end"
    assert route_after_match({"automation": {"id": "auto-1"}}) == "continue"

def test_route_after_execution():
    assert route_after_execution({"outcome": "duplicate"}) == "end"
    assert route_after_execution({"execution_id": None}) == "end"
    assert route_after_execution({"execution_id": "exec-123"}) == "continue"

def test_route_gate():
    assert route_gate({"automation": {"intent_gate_enabled": True}}) == "gate"
    assert route_gate({"automation": {"intent_gate_enabled": False}}) == "skip_gate"
    assert route_gate({}) == "skip_gate"

def test_route_reply_mode():
    assert route_reply_mode({"automation": {"reply_mode": "ai"}}) == "ai"
    assert route_reply_mode({"automation": {"reply_mode": "static"}}) == "static"
    assert route_reply_mode({}) == "static"

def test_route_after_validate():
    assert route_after_validate({"fallback_used": True}) == "static"
    assert route_after_validate({"fallback_used": False}) == "send"

def test_route_after_send():
    assert route_after_send({"send_result": {"ok": True}}) == "done"
    assert route_after_send({"send_result": {"ok": False, "retryable": True}, "attempts": 1}) == "retry"
    assert route_after_send({"send_result": {"ok": False, "retryable": True}, "attempts": 3}) == "done"
    assert route_after_send({"send_result": {"ok": False, "retryable": False}, "attempts": 1}) == "done"
