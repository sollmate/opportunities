from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ThreadStatus = Literal["idle", "in_progress", "awaiting_input", "draft"]


class Thread(BaseModel):
    """A single agent conversation thread, as shown in the sidebar history."""

    id: str
    title: str
    preview: str | None = None
    status: ThreadStatus = "idle"
    updatedAt: datetime
    turnCount: int | None = None


class ThreadListResponse(BaseModel):
    """Response for GET /api/threads — threads are returned newest-first."""

    threads: list[Thread]
