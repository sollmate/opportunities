"""The agent seam.

This module is the single integration point for the real agent. The chat route
depends on the `AgentService` protocol — it does not care how a reply is produced.

To plug in the real agent:

1. Implement a class satisfying `AgentService` (an `async generate_reply`).
2. Return an instance of it from `get_agent_service()` in `app/api/deps.py`.

Nothing else in the backend or frontend needs to change.
"""

from typing import Protocol
from uuid import uuid4

from app.schemas.chat import Message


class AgentService(Protocol):
    """Produces an assistant reply given the conversation so far."""

    async def generate_reply(self, messages: list[Message], conversation_id: str | None) -> Message:
        """Return the assistant's next message for the conversation."""
        ...


class EchoAgentService:
    """Placeholder agent that echoes the last user message.

    Replace with the real agent implementation. Exists only so the chat
    endpoint and frontend can be developed and tested end to end.
    """

    async def generate_reply(self, messages: list[Message], conversation_id: str | None) -> Message:
        last_user = next(
            (m.content for m in reversed(messages) if m.role == "user"),
            "",
        )
        return Message(role="assistant", content=f"You said: {last_user}")


def new_conversation_id() -> str:
    return uuid4().hex
