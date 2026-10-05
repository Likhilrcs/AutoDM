from typing import Literal
from app.agents.state import AutomationState
from app.core.config import settings

def entry_router(state: AutomationState) -> Literal["new", "retry"]:
    """Direct new runs to ingest_event, or manual retries directly to send_dm."""
    if state.get("resume_from") == "send":
        return "retry"
    return "new"

def route_after_ingest(state: AutomationState) -> Literal["continue", "end"]:
    """Stop processing if comment was authored by the account itself or unknown."""
    if state.get("outcome") == "ignored":
        return "end"
    return "continue"

def route_after_match(state: AutomationState) -> Literal["continue", "end"]:
    """Stop processing if no active automation matches the keyword."""
    if not state.get("automation") or state.get("outcome") == "no_match":
        return "end"
    return "continue"

def route_after_execution(state: AutomationState) -> Literal["continue", "end"]:
    """Stop processing if this comment/user was already processed (deduplication check)."""
    if state.get("outcome") == "duplicate" or not state.get("execution_id"):
        return "end"
    return "continue"

def route_gate(state: AutomationState) -> Literal["gate", "skip_gate"]:
    """Evaluate whether the optional AI intent gate is enabled and AI is active."""
    auto = state.get("automation") or {}
    if auto.get("intent_gate_enabled") and settings.AI_ENABLED:
        return "gate"
    return "skip_gate"

def route_after_gate(state: AutomationState) -> Literal["continue", "end"]:
    """Halt if AI classified comment as spam or unrelated."""
    if state.get("outcome") == "skipped":
        return "end"
    return "continue"

def route_reply_mode(state: AutomationState) -> Literal["ai", "static"]:
    """Route to LangChain personalization if reply_mode is 'ai', else static render."""
    auto = state.get("automation") or {}
    if auto.get("reply_mode") == "ai" and settings.AI_ENABLED:
        return "ai"
    return "static"

def route_after_validate(state: AutomationState) -> Literal["send", "static"]:
    """If AI output passed guardrails send DM, otherwise fall back to static template."""
    if state.get("fallback_used"):
        return "static"
    return "send"

def route_after_send(state: AutomationState) -> Literal["retry", "done"]:
    """Evaluate if message failed with retryable code and attempts < DM_MAX_ATTEMPTS."""
    send_result = state.get("send_result") or {}
    attempts = state.get("attempts", 0)

    if not send_result.get("ok") and send_result.get("retryable") and attempts < settings.DM_MAX_ATTEMPTS:
        return "retry"
    return "done"
