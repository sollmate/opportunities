"""In-memory, per-process session store (stateless MVP — no DB)."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from threading import Lock

from src.api.schemas.master_data import MasterData


@dataclass
class Session:
    session_id: str
    root_dir: str
    skr_variant: str
    master_data: MasterData
    missing_fields: list[str] = field(default_factory=list)
    history: list[dict] = field(default_factory=list)


class SessionStore:
    def __init__(self) -> None:
        self._data: dict[str, Session] = {}
        self._lock = Lock()

    def create(self, **kwargs) -> Session:
        sid = uuid.uuid4().hex
        s = Session(session_id=sid, **kwargs)
        with self._lock:
            self._data[sid] = s
        return s

    def get(self, sid: str) -> Session | None:
        return self._data.get(sid)


STORE = SessionStore()
