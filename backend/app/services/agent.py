"""The agent seam.

This module is the single integration point for the real agent service. The
chat route does not know how a reply is produced — it streams whatever the
agent emits. The threads route uses the same client to create a session by
uploading a DATEV export.

The agent service is never exposed to the browser: this backend is the only
caller, adding Postgres persistence in front of it. Both services share a single
Entra app registration and accept the same access token, so the backend forwards
the caller's bearer token to the agent (which validates it independently and
enforces the app role).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Protocol

import aiohttp


class AgentError(RuntimeError):
    """Raised when the agent service returns an error (e.g. unknown session)."""


class AgentService(Protocol):
    """Creates agent sessions and streams replies for a conversation."""

    async def create_session(
        self,
        datev_filename: str,
        datev_bytes: bytes,
        master_filename: str | None = None,
        master_bytes: bytes | None = None,
        access_token: str | None = None,
    ) -> str:
        """Upload a DATEV export, returning the agent's session id."""
        ...

    def stream_message(
        self, agent_session_id: str, text: str, access_token: str | None = None
    ) -> AsyncIterator[tuple[str, str]]:
        """Stream the agent's reply as (event, data) SSE frames."""
        ...


def _iter_sse(line_buffer: list[str]) -> tuple[str, str] | None:
    """Turn a completed group of SSE lines into one (event, data) frame.

    Defaults to the "message" event per the SSE spec; joins multi-line data
    with newlines.
    """
    event = "message"
    data_parts: list[str] = []
    for line in line_buffer:
        if line.startswith("event:"):
            event = line[len("event:") :].strip()
        elif line.startswith("data:"):
            data_parts.append(line[len("data:") :].lstrip())
    if not data_parts and event == "message":
        return None
    return event, "\n".join(data_parts)


class AgentClient:
    """HTTP client for the standalone agent service (FastAPI + SSE)."""

    def __init__(self, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    @staticmethod
    def _auth_headers(access_token: str | None) -> dict[str, str]:
        """Forward the caller's Entra bearer token to the agent, if present."""
        return {"Authorization": f"Bearer {access_token}"} if access_token else {}

    async def create_session(
        self,
        datev_filename: str,
        datev_bytes: bytes,
        master_filename: str | None = None,
        master_bytes: bytes | None = None,
        access_token: str | None = None,
    ) -> str:
        form = aiohttp.FormData()
        form.add_field(
            "datev_file",
            datev_bytes,
            filename=datev_filename or "upload.csv",
            content_type="application/octet-stream",
        )
        if master_bytes is not None:
            form.add_field(
                "master_data_file",
                master_bytes,
                filename=master_filename or "master_data.json",
                content_type="application/json",
            )

        url = f"{self._base_url}/tax-advisory/session"
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url, data=form, headers=self._auth_headers(access_token)
            ) as resp:
                if resp.status != 200:
                    detail = await resp.text()
                    raise AgentError(f"Agent session creation failed ({resp.status}): {detail}")
                payload = await resp.json()
        return payload["session_id"]

    async def stream_message(
        self, agent_session_id: str, text: str, access_token: str | None = None
    ) -> AsyncIterator[tuple[str, str]]:
        url = f"{self._base_url}/tax-advisory/session/{agent_session_id}/message"
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url, json={"text": text}, headers=self._auth_headers(access_token)
            ) as resp:
                if resp.status == 404:
                    raise AgentError(
                        "Agent session not found — the agent may have restarted. "
                        "Start a new chat by uploading the ledger again."
                    )
                if resp.status != 200:
                    detail = await resp.text()
                    raise AgentError(f"Agent message failed ({resp.status}): {detail}")

                buffer: list[str] = []
                async for raw in resp.content:
                    line = raw.decode("utf-8").rstrip("\n").rstrip("\r")
                    if line == "":
                        frame = _iter_sse(buffer)
                        buffer = []
                        if frame is not None:
                            yield frame
                        continue
                    buffer.append(line)
                # Flush a trailing frame that wasn't terminated by a blank line.
                if buffer:
                    frame = _iter_sse(buffer)
                    if frame is not None:
                        yield frame
