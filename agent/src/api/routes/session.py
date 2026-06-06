"""Session creation (upload) + streaming message endpoint (SSE)."""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from src.agent.supervisor import build_agent
from src.api.schemas.master_data import MasterData
from src.api.schemas.session import CreateSessionResponse, MessageRequest
from src.config.settings import ensure_workspace
from src.parsers.master_data import load_master_data
from src.parsers.user_files import save_user_file
from src.session.state import STORE

router = APIRouter(prefix="/tax-advisory", tags=["tax-advisory"])


def _extract_text(content) -> str:
    """Anthropic streaming chunks carry content as a list of typed blocks.

    Pull out only the text deltas so the wire payload stays a plain string;
    skip tool-input deltas and any other non-text blocks.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text")
                if isinstance(t, str):
                    parts.append(t)
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts)
    return ""


def _upload_note(entry: dict) -> str:
    """System-style nudge added to the chat history when a file is uploaded.

    Tells the agent the file exists, where it lives, and that it should be
    considered when answering. Surfaces a quick column preview so the agent
    can decide relevance without opening the file first.
    """
    cols = entry.get("columns") or []
    col_preview = ", ".join(str(c) for c in cols[:8])
    if len(cols) > 8:
        col_preview += ", …"
    return (
        f"[System] The user uploaded `{entry['original_name']}`. "
        f"It is available at `{entry['virtual_path']}` "
        f"({entry.get('rows', 0)} rows; columns: {col_preview}). "
        "Take it into consideration when answering — it may contain data "
        "relevant to the user's question. The full catalog is at "
        "`/uploads/_index.json`; read this file per the user-uploaded-files skill."
    )


@router.post("/session", response_model=CreateSessionResponse)
async def create_session(
    datev_file: UploadFile | None = File(None, description="Optional CSV or Excel upload"),
    master_data_file: UploadFile | None = File(
        None,
        description=(
            "Optional master-data JSON. Normally master data is fetched from "
            "Postgres via the agent's fetch_master_data tool; this field exists "
            "only for offline / Postman flows."
        ),
    ),
) -> CreateSessionResponse:
    """Open a session, optionally attaching a CSV/Excel + master data.

    Uploads are stored as generic user files under `/uploads/` and indexed in
    `/uploads/_index.json`; the agent reads them per the user-uploaded-files
    skill. Master data is sourced from Postgres on demand by the agent itself
    (see `fetch_master_data`) — only a caller that explicitly uploads a JSON
    file here causes `/master_data.json` to be written.
    """
    # Each session owns its own subdirectory under PROJECT_ROOT so uploads,
    # /master_data.json, and the staged skills tree never collide across
    # concurrent sessions.
    session_id = uuid.uuid4().hex
    session_dir = ensure_workspace() / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    upload_entry: dict | None = None
    ledger_rows = 0
    if datev_file is not None:
        raw = await datev_file.read()
        try:
            upload_entry = save_user_file(raw, datev_file.filename or "upload.csv", str(session_dir))
        except ValueError as exc:
            raise HTTPException(status_code=415, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"upload failed: {exc}") from exc
        ledger_rows = int(upload_entry.get("rows") or 0)

    master_data: MasterData
    missing_fields: list[str] = []
    if master_data_file is not None:
        md_bytes = await master_data_file.read()
        md, missing = load_master_data(md_bytes)
        master_data = md
        missing_fields = missing.fields
        Path(session_dir, "master_data.json").write_text(
            master_data.model_dump_json(), encoding="utf-8"
        )
    else:
        master_data = MasterData()

    s = STORE.create(
        session_id=session_id,
        root_dir=str(session_dir),
        skr_variant=master_data.skr_variant,
        master_data=master_data,
        missing_fields=missing_fields,
    )
    if upload_entry is not None:
        s.history.append({"role": "user", "content": _upload_note(upload_entry)})
    return CreateSessionResponse(
        session_id=s.session_id,
        ledger_rows=ledger_rows,
        skr_variant=master_data.skr_variant,
        master_data_complete=not missing_fields,
        missing_fields=missing_fields,
    )


@router.post("/session/{session_id}/file")
async def upload_file(session_id: str, file: UploadFile = File(..., description="CSV or Excel file")):
    """Attach an extra CSV/Excel file to a session; the agent will see it under /uploads/."""
    s = STORE.get(session_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Unknown session")
    raw = await file.read()
    try:
        entry = save_user_file(raw, file.filename or "upload.bin", s.root_dir)
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"upload failed: {exc}") from exc

    s.history.append({"role": "user", "content": _upload_note(entry)})
    return entry


@router.post("/session/{session_id}/message")
async def message(session_id: str, body: MessageRequest):
    """Stream the agent's reasoning, interview questions, and triggers as SSE."""
    s = STORE.get(session_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Unknown session")

    agent = build_agent(s.root_dir)
    s.history.append({"role": "user", "content": body.text})

    async def event_generator():
        try:
            async for ev in agent.astream_events(
                {"messages": s.history},
                version="v2",
                config={"recursion_limit": 500},
            ):
                etype = ev["event"]
                if etype == "on_chat_model_stream":
                    chunk = ev["data"]["chunk"]
                    text = _extract_text(getattr(chunk, "content", ""))
                    if text:
                        yield {"event": "token", "data": text}
                elif etype == "on_tool_start":
                    yield {
                        "event": "tool_start",
                        "data": json.dumps({"tool": ev.get("name")}),
                    }
                elif etype == "on_tool_end":
                    yield {
                        "event": "tool_end",
                        "data": json.dumps({"tool": ev.get("name")}, default=str),
                    }
                elif etype == "on_chain_end" and ev.get("name") == "LangGraph":
                    out = ev["data"].get("output", {})
                    msgs = out.get("messages") if isinstance(out, dict) else None
                    if msgs:
                        final = msgs[-1]
                        content = getattr(final, "content", str(final))
                        s.history.append({"role": "assistant", "content": content})
                        yield {
                            "event": "final",
                            "data": json.dumps({"content": content}),
                        }
        except Exception as exc:
            yield {"event": "error", "data": json.dumps({"error": str(exc)})}
        finally:
            yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(event_generator())
