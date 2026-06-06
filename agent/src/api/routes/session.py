"""Session creation (upload) + streaming message endpoint (SSE)."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from src.agent.supervisor import build_agent
from src.api.schemas.session import CreateSessionResponse, MessageRequest
from src.config.settings import get_settings, ensure_workspace
from src.parsers.datev_parser import detect_skr, parse_datev, write_ledger_json
from src.parsers.master_data import load_master_data
from src.parsers.user_files import save_user_file
from src.session.state import STORE

router = APIRouter(prefix="/tax-advisory", tags=["tax-advisory"])


@router.post("/session", response_model=CreateSessionResponse)
async def create_session(
    datev_file: UploadFile = File(..., description="DATEV EXTF Buchungsstapel CSV or Excel"),
    master_data_file: UploadFile | None = File(None, description="Master-data companion JSON"),
) -> CreateSessionResponse:
    """Ingest the DATEV export + optional master data; normalize into the virtual FS."""
    workspace = ensure_workspace()
    raw = await datev_file.read()
    try:
        df = parse_datev(raw, datev_file.filename or "upload.csv")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"DATEV parse failed: {exc}") from exc
    if df.empty:
        raise HTTPException(status_code=422, detail="No booking rows found.")

    skr = detect_skr(df)
    write_ledger_json(df, str(workspace))

    md_bytes = await master_data_file.read() if master_data_file else None
    master_data, missing = load_master_data(md_bytes)
    if master_data.skr_variant is None:
        master_data.skr_variant = skr

    # Persist master data for the agent
    Path(workspace, "master_data.json").write_text(
        master_data.model_dump_json(), encoding="utf-8"
    )

    s = STORE.create(
        root_dir=str(workspace),
        skr_variant=skr,
        master_data=master_data,
        missing_fields=missing.fields,
    )
    return CreateSessionResponse(
        session_id=s.session_id,
        ledger_rows=len(df),
        skr_variant=skr,
        master_data_complete=not missing.fields,
        missing_fields=missing.fields,
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

    note = (
        f"[System] User uploaded `{entry['original_name']}` → "
        f"`{entry['virtual_path']}` ({entry['rows']} rows, columns: {entry['columns'][:8]}"
        f"{'…' if len(entry['columns']) > 8 else ''}). "
        "Catalog at `/uploads/_index.json`. Read per the user-uploaded-files skill."
    )
    s.history.append({"role": "user", "content": note})
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
                    if getattr(chunk, "content", ""):
                        yield {"event": "token", "data": chunk.content}
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
