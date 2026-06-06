from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["user", "assistant", "system"]


class Message(BaseModel):
    """A single chat message."""

    role: Role
    content: str


class ChatRequest(BaseModel):
    """Incoming chat request: the conversation so far."""

    conversation_id: str | None = None
    messages: list[Message] = Field(..., min_length=1)


class ChatResponse(BaseModel):
    """The agent's reply for a conversation."""

    conversation_id: str
    message: Message
