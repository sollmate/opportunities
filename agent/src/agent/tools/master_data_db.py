"""Fetch master data from Postgres and write it into the agent's VFS as /master_data.json.

Connection comes from `settings.database_url`. Table and key column are hardcoded to the
single source of truth in our DB: `crm.client` keyed by `client_id` (uuid). The full row
is dumped to /master_data.json as a flat JSON object — no schema mapping, the agent reads
whatever columns the row has.
"""
from __future__ import annotations

import json
from pathlib import Path

from langchain_core.tools import tool

from src.config.settings import get_settings

_SCHEMA = "crm"
_TABLE = "client"
_KEY_COL = "client_id"


@tool
def fetch_master_data(client_id: str) -> str:
    """Load the `crm.client` row for the given client_id (uuid) and write it as /master_data.json.

    Returns JSON: {"ok": true, "virtual_path": "/master_data.json", "columns": [...], "data": {...}}
    or {"ok": false, "error": "..."}. After a successful call, read /master_data.json.
    """
    settings = get_settings()
    return _run_fetch_master_data(client_id, Path(settings.project_root).resolve())


def make_fetch_master_data(root_dir: str):
    """Build a session-scoped `fetch_master_data` tool bound to `root_dir`.

    The agent supervisor calls this per session so the resulting
    `/master_data.json` is written into the session's own workspace rather
    than the shared `settings.project_root` (which would leak across sessions).
    """
    root = Path(root_dir).resolve()

    @tool
    def fetch_master_data(client_id: str) -> str:
        """Load the `crm.client` row for the given client_id (uuid) and write it as /master_data.json.

        Returns JSON: {"ok": true, "virtual_path": "/master_data.json", "columns": [...], "data": {...}}
        or {"ok": false, "error": "..."}. After a successful call, read /master_data.json.
        """
        return _run_fetch_master_data(client_id, root)

    return fetch_master_data


def _run_fetch_master_data(client_id: str, root: Path) -> str:
    settings = get_settings()
    if not settings.database_url:
        return json.dumps({"ok": False, "error": "DATABASE_URL is not configured"})

    try:
        import psycopg
    except ImportError:
        return json.dumps({"ok": False, "error": "psycopg is not installed"})

    sql = f'SELECT * FROM "{_SCHEMA}"."{_TABLE}" WHERE "{_KEY_COL}" = %s LIMIT 1'

    try:
        with psycopg.connect(settings.database_url, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (client_id,))
                row = cur.fetchone()
                if row is None:
                    return json.dumps(
                        {"ok": False, "error": f"no row in {_SCHEMA}.{_TABLE} for {_KEY_COL}={client_id!r}"}
                    )
                columns = [d.name for d in cur.description]
    except Exception as exc:
        return json.dumps({"ok": False, "error": f"{type(exc).__name__}: {exc}"})

    data = {k: _jsonable(v) for k, v in zip(columns, row)}

    out = root / "master_data.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return json.dumps(
        {"ok": True, "virtual_path": "/master_data.json", "columns": columns, "data": data},
        default=str,
    )


def _jsonable(v):
    if hasattr(v, "isoformat"):
        return v.isoformat()
    try:
        json.dumps(v)
        return v
    except TypeError:
        return str(v)
