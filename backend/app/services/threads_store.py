"""Postgres-backed persistence for chat threads and messages.

Threads are scoped per user (the Entra object id from the validated token).
All queries go through the managed-identity connection pool in
``app.core.db``. The ``chat`` schema is defined in ``db/chat_schema.sql``.
"""

from __future__ import annotations

from app.core import db
from app.schemas.chat import Message
from app.schemas.thread import Thread, ThreadStatus


def _to_thread(row) -> Thread:
    return Thread(
        id=str(row["thread_id"]),
        title=row["title"],
        preview=row["preview"],
        status=row["status"],
        updatedAt=row["updated_at"],
        turnCount=row["turn_count"] or None,
    )


# Selects the thread row plus a derived preview (last message) and turn count
# (number of user messages). Shared by the list and single-thread queries.
_THREAD_SELECT = """
    SELECT
        t.thread_id,
        t.title,
        t.status,
        t.updated_at,
        (SELECT count(*) FROM chat.message m
            WHERE m.thread_id = t.thread_id AND m.role = 'user') AS turn_count,
        (SELECT m.content FROM chat.message m
            WHERE m.thread_id = t.thread_id
            ORDER BY m.created_at DESC LIMIT 1) AS preview
    FROM chat.thread t
"""


async def create_thread(user_id: str, agent_session_id: str, title: str) -> Thread:
    pool = db.get_pool()
    async with pool.acquire() as conn:
        thread_id = await conn.fetchval(
            """
            INSERT INTO chat.thread (user_id, agent_session_id, title)
            VALUES ($1, $2, $3)
            RETURNING thread_id
            """,
            user_id,
            agent_session_id,
            title,
        )
        row = await conn.fetchrow(
            _THREAD_SELECT + " WHERE t.thread_id = $1",
            thread_id,
        )
    return _to_thread(row)


async def list_threads(user_id: str) -> list[Thread]:
    pool = db.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            _THREAD_SELECT + " WHERE t.user_id = $1 ORDER BY t.updated_at DESC",
            user_id,
        )
    return [_to_thread(r) for r in rows]


async def get_thread(user_id: str, thread_id: str) -> Thread | None:
    """Return the thread if it exists and belongs to the user, else None."""
    pool = db.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            _THREAD_SELECT + " WHERE t.thread_id = $1 AND t.user_id = $2",
            thread_id,
            user_id,
        )
    return _to_thread(row) if row else None


async def get_agent_session_id(user_id: str, thread_id: str) -> str | None:
    """Return the agent session id for a user's thread, or None if not owned."""
    pool = db.get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval(
            """
            SELECT agent_session_id FROM chat.thread
            WHERE thread_id = $1 AND user_id = $2
            """,
            thread_id,
            user_id,
        )


async def list_messages(thread_id: str) -> list[Message]:
    pool = db.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content FROM chat.message
            WHERE thread_id = $1
            ORDER BY created_at
            """,
            thread_id,
        )
    return [Message(role=r["role"], content=r["content"]) for r in rows]


async def add_message(thread_id: str, role: str, content: str) -> None:
    pool = db.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO chat.message (thread_id, role, content)
            VALUES ($1, $2, $3)
            """,
            thread_id,
            role,
            content,
        )


async def touch_thread(thread_id: str, status: ThreadStatus) -> None:
    """Update a thread's status; the updated_at trigger refreshes the timestamp."""
    pool = db.get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE chat.thread SET status = $2 WHERE thread_id = $1",
            thread_id,
            status,
        )
