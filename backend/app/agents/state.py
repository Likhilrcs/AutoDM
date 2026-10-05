from typing import TypedDict, Literal, Optional, List, Dict, Any

class AutomationState(TypedDict, total=False):
    # Input
    incoming_event_id: str
    user_id: str
    social_account_id: str
    external_post_id: str
    comment_id: str
    commenter_id: str
    commenter_username: str
    comment_text: str

    # Matching
    normalized_text: str
    candidates: List[Dict[str, Any]] # active automations for account + post
    automation: Optional[Dict[str, Any]] # the single chosen automation

    # Execution
    execution_id: Optional[str]
    resume_from: Optional[Literal["start", "send"]] # "send" for manual retry

    # AI
    intent: Optional[Dict[str, Any]] # {is_genuine, category, confidence}
    reply_text: Optional[str]
    generation_mode: Optional[Literal["static", "ai"]]
    fallback_used: bool

    # Send
    attempts: int
    send_result: Optional[Dict[str, Any]] # {ok, external_message_id, error_code, retryable}

    # Outcome
    outcome: Optional[Literal["success", "failed", "skipped", "no_match", "duplicate", "ignored"]]
    error: Optional[Dict[str, Any]]
