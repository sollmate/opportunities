"""Persist a user-uploaded CSV/Excel into the agent's VFS as readable text.

We keep the raw upload (`/uploads/<name>`) for traceability and write a normalized CSV
(`/uploads/<stem>.csv`) for the agent to read. An `/uploads/_index.json` lists every
upload so the agent can discover them without having to list the directory.
"""
from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ALLOWED_EXT = {".csv", ".xlsx", ".xls"}


def save_user_file(raw: bytes, filename: str, root_dir: str) -> dict:
    """Persist a single upload and return its index entry."""
    safe_name = Path(filename).name  # strip any path components
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise ValueError(f"unsupported file type: {ext or '<none>'} (allowed: {sorted(ALLOWED_EXT)})")

    uploads = Path(root_dir) / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)

    raw_path = uploads / safe_name
    raw_path.write_bytes(raw)

    parse_error: str | None = None
    df: pd.DataFrame | None = None
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(raw), sep=None, engine="python")
        else:
            df = pd.read_excel(io.BytesIO(raw))
    except Exception as exc:
        parse_error = f"{type(exc).__name__}: {exc}"

    stem = Path(safe_name).stem
    text_name = f"{stem}.csv"
    text_path = uploads / text_name

    if df is not None:
        df.to_csv(text_path, index=False, encoding="utf-8")
        rows = int(len(df))
        cols = [str(c) for c in df.columns]
    else:
        text_path.write_text(f"# parse failed: {parse_error}\n", encoding="utf-8")
        rows, cols = 0, []

    entry = {
        "original_name": safe_name,
        "virtual_path": f"/uploads/{text_name}",
        "raw_virtual_path": f"/uploads/{safe_name}",
        "rows": rows,
        "columns": cols,
        "parse_error": parse_error,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

    index_path = uploads / "_index.json"
    index: list[dict] = []
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
            if not isinstance(index, list):
                index = []
        except Exception:
            index = []
    # dedupe by virtual_path so re-uploads overwrite cleanly
    index = [e for e in index if e.get("virtual_path") != entry["virtual_path"]]
    index.append(entry)
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    return entry
