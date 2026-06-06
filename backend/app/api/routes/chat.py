"""Streaming chat endpoint.

Relays the agent service's SSE stream (token / tool_start / tool_end / final /
error / done) to the browser, while persisting the user message up front and the
assistant's final reply once it arrives. Auth and ownership are enforced before
any agent call.
"""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_access_token, get_agent_service, get_current_user
from app.schemas.chat import ChatRequest
from app.services import threads_store
from app.services.agent import AgentError, AgentService

router = APIRouter(prefix="/chat", tags=["chat"])


def _content_to_text(content) -> str:
    """Coerce an agent reply into plain text for storage and display.

    The agent's ``final`` event may carry ``content`` either as a string or as
    a list of content blocks (e.g. ``[{"type": "text", "text": "..."}]``). The
    ``chat.message.content`` column and the frontend both expect a string, so
    flatten any block list by concatenating the ``text`` of each block.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "") if isinstance(block, dict) else str(block) for block in content
        )
    return str(content)


@router.post("")
async def chat(
    request: ChatRequest,
    user_id: Annotated[str, Depends(get_current_user)],
    agent: Annotated[AgentService, Depends(get_agent_service)],
    access_token: Annotated[str, Depends(get_access_token)],
):
    agent_session_id = await threads_store.get_agent_session_id(user_id, request.thread_id)
    if agent_session_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown thread")

    await threads_store.add_message(request.thread_id, "user", request.text)
    await threads_store.touch_thread(request.thread_id, "in_progress")

    async def event_generator():
        final_content = ""
        try:
            async for event, data in agent.stream_message(
                agent_session_id, request.text, access_token
            ):
                if event == "final":
                    # Anthropic streams `content` as a list of typed blocks
                    # (e.g. [{"type": "text", "text": "..."}]). Flatten to a
                    # plain string on the wire so the frontend can render it
                    # directly without knowing about content-block shapes, and
                    # persist the same string.
                    try:
                        final_content = _content_to_text(json.loads(data).get("content", ""))
                    except (json.JSONDecodeError, AttributeError):
                        final_content = data
                    data = json.dumps({"content": final_content})
                yield {"event": event, "data": data}
        except AgentError as exc:
            yield {"event": "error", "data": json.dumps({"error": str(exc)})}
        finally:
            # Persist whatever the assistant produced, even on early disconnect.
            if final_content:
                await threads_store.add_message(request.thread_id, "assistant", final_content)
            await threads_store.touch_thread(request.thread_id, "idle")

    return EventSourceResponse(event_generator())
