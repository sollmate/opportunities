"""Pydantic schemas for session API."""
from __future__ import annotations

from pydantic import BaseModel


class CreateSessionResponse(BaseModel):
    session_id: str
    ledger_rows: int
    skr_variant: str | None
    master_data_complete: bool
    missing_fields: list[str]


class MessageRequest(BaseModel):
    text: str
