from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["user", "assistant", "system"]


class Message(BaseModel):
    """A single chat message."""

    role: Role
    content: str


class ChatRequest(BaseModel):
    """Incoming chat request: a new message for an existing thread.

    The reply is streamed back as Server-Sent Events, so there is no JSON
    response body.
    """

    thread_id: str
    text: str = Field(..., min_length=1)


class MessagesResponse(BaseModel):
    """Persisted history for a thread (GET /api/threads/{id}/messages)."""

    messages: list[Message]
