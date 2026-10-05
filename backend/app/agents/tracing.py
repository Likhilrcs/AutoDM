import time
from functools import wraps
from typing import Callable, Any, Dict
from app.agents.state import AutomationState
from app.repositories.step_repository import step_repo
from app.utils.logger import logger

def traced(node_name: str, fn: Callable):
    """
    Decorator for LangGraph nodes:
    - Measures duration_ms
    - Emits structured audit log
    - Records node execution step to execution_steps table
    """
    @wraps(fn)
    async def wrapper(state: AutomationState) -> Dict[str, Any]:
        start_time = time.perf_counter()
        user_id = state.get("user_id", "")
        incoming_event_id = state.get("incoming_event_id", "")
        execution_id = state.get("execution_id")

        step_status = "success"
        error_code = None
        summary: Dict[str, Any] = {}
        llm_model = None
        tokens_in = None
        tokens_out = None

        logger.info(
            f"Node {node_name} started",
            extra={
                "node": node_name,
                "event_id": incoming_event_id,
                "execution_id": execution_id or "",
                "user_id": user_id,
            }
        )

        try:
            # Handle both async and sync nodes
            result = fn(state)
            if hasattr(result, "__await__"):
                result = await result

            # Extract tracing metadata from state or result
            if isinstance(result, dict):
                if result.get("outcome") in ["skipped", "no_match", "duplicate", "ignored"]:
                    step_status = "skipped"
                if result.get("fallback_used"):
                    step_status = "fallback"

                if "matched_automation" in result:
                    summary["matched_automation"] = result["matched_automation"]
                if "intent" in result and result["intent"]:
                    summary["is_genuine"] = result["intent"].get("is_genuine")
                    summary["confidence"] = result["intent"].get("confidence")
                    llm_model = result["intent"].get("model")
                if "reply_text" in result and result["reply_text"]:
                    summary["reply_len"] = len(result["reply_text"])
                if "send_result" in result and result["send_result"]:
                    summary["send_ok"] = result["send_result"].get("ok")

            return result

        except Exception as e:
            step_status = "failed"
            error_code = getattr(e, "code", "NODE_EXECUTION_ERROR")
            summary["error"] = str(e)
            logger.error(
                f"Node {node_name} failed: {e}",
                extra={
                    "node": node_name,
                    "event_id": incoming_event_id,
                    "execution_id": execution_id or "",
                    "user_id": user_id,
                }
            )
            raise e
        finally:
            duration_ms = int((time.perf_counter() - start_time) * 1000)

            # Persist step if user_id & event_id are available
            if user_id and incoming_event_id:
                try:
                    step_repo.record_step(
                        user_id=user_id,
                        incoming_event_id=incoming_event_id,
                        execution_id=execution_id,
                        node=node_name,
                        status=step_status,
                        duration_ms=duration_ms,
                        summary=summary,
                        error_code=error_code,
                        llm_model=llm_model,
                        tokens_in=tokens_in,
                        tokens_out=tokens_out,
                    )
                except Exception as ex:
                    logger.warning(f"Failed to record step for {node_name}: {ex}")

    return wrapper
