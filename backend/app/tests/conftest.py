from collections.abc import AsyncIterator, Iterator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_agent_service, get_current_user
from app.main import app
from app.schemas.chat import Message
from app.schemas.thread import Thread
from app.services import threads_store

TEST_USER = "test-user"


@pytest.fixture
def client() -> TestClient:
    """Client with no authentication override — used for unauthenticated cases."""
    return TestClient(app)


@pytest.fixture
def authed_client() -> Iterator[TestClient]:
    """Client that bypasses Entra token validation with a stub authorized user.

    Real Entra access tokens can't be minted in unit tests, so the auth
    dependency is overridden to return a fixed user identity.
    """
    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


class FakeAgent:
    """Stand-in for AgentClient that never touches the network."""

    def __init__(self) -> None:
        self.created: list[str] = []

    async def create_session(
        self,
        datev_filename,
        datev_bytes,
        master_filename=None,
        master_bytes=None,
        access_token=None,
    ):
        self.created.append(datev_filename)
        return "agent-sess-1"

    async def stream_message(
        self, agent_session_id, text, access_token=None
    ) -> AsyncIterator[tuple[str, str]]:
        yield ("token", "Hel")
        yield ("token", "lo")
        yield ("final", '{"content": "Hello there"}')
        yield ("done", "[DONE]")


@pytest.fixture
def chat_client(authed_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """Authed client with the agent service and Postgres store faked in memory."""
    app.dependency_overrides[get_agent_service] = lambda: FakeAgent()

    threads: dict[str, dict] = {}
    messages: dict[str, list[Message]] = {}

    async def create_thread(user_id, agent_session_id, title):
        tid = uuid4().hex
        threads[tid] = {
            "user_id": user_id,
            "agent_session_id": agent_session_id,
            "title": title,
            "status": "idle",
            "updated_at": datetime.now(UTC),
        }
        messages[tid] = []
        return _thread(tid)

    def _thread(tid: str) -> Thread:
        t = threads[tid]
        msgs = messages[tid]
        return Thread(
            id=tid,
            title=t["title"],
            preview=msgs[-1].content if msgs else None,
            status=t["status"],
            updatedAt=t["updated_at"],
            turnCount=sum(1 for m in msgs if m.role == "user") or None,
        )

    async def list_threads(user_id):
        return [_thread(tid) for tid, t in threads.items() if t["user_id"] == user_id]

    async def get_thread(user_id, thread_id):
        t = threads.get(thread_id)
        return _thread(thread_id) if t and t["user_id"] == user_id else None

    async def get_agent_session_id(user_id, thread_id):
        t = threads.get(thread_id)
        return t["agent_session_id"] if t and t["user_id"] == user_id else None

    async def list_messages(thread_id):
        return list(messages.get(thread_id, []))

    async def add_message(thread_id, role, content):
        messages.setdefault(thread_id, []).append(Message(role=role, content=content))

    async def touch_thread(thread_id, status):
        if thread_id in threads:
            threads[thread_id]["status"] = status

    for name, fn in {
        "create_thread": create_thread,
        "list_threads": list_threads,
        "get_thread": get_thread,
        "get_agent_session_id": get_agent_session_id,
        "list_messages": list_messages,
        "add_message": add_message,
        "touch_thread": touch_thread,
    }.items():
        monkeypatch.setattr(threads_store, name, fn)

    try:
        yield authed_client
    finally:
        app.dependency_overrides.pop(get_agent_service, None)
