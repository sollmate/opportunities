"""The ONE custom tool: a restricted code sandbox for tabular aggregation.

Uses RestrictedPython to compile a safe AST subset, then exec it with a tightly
whitelisted namespace exposing only `df` (the loaded DataFrame), `pd`, and `np`.

The LLM must assign its answer to `result`. All monetary arithmetic happens here,
never in the model's head.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from langchain_core.tools import tool
from RestrictedPython import compile_restricted, safe_globals
from RestrictedPython.Eval import default_guarded_getitem


@tool
def ledger_compute(code: str, data_path: str = "/ledger.json") -> str:
    """Run a small Python snippet over a user-uploaded data file and return JSON.

    Pass `data_path` as the virtual path to a user upload (the `virtual_path`
    field in `/uploads/_index.json`) or to a JSON file. Excel uploads are stored
    on disk as CSV text under their original `.xlsx`/`.xls` filename, so the
    extension is just a label — contents are always CSV unless the extension is
    `.json`. The file is loaded into a pandas DataFrame named `df` with whatever
    columns it has. `pd` and `np` are available. Assign the final value to a
    variable named `result`.

    Example:
        ledger_compute(
            data_path="/uploads/bookings.xlsx",
            code="result = float(df['amount'].sum())",
        )
    """
    return _run_ledger_compute(code, data_path, root=None)


def make_ledger_compute(root_dir: str):
    """Build a session-scoped `ledger_compute` tool bound to `root_dir`.

    The agent supervisor calls this per session so the sandbox resolves
    `data_path` against the session's own workspace instead of the global
    `settings.project_root` (which would leak state across sessions).
    """
    root = Path(root_dir).resolve()

    @tool
    def ledger_compute(code: str, data_path: str = "/ledger.json") -> str:
        """Run a small Python snippet over a user-uploaded data file and return JSON.

        Pass `data_path` as the virtual path to a user upload (the `virtual_path`
        field in `/uploads/_index.json`) or to a JSON file. Excel uploads are
        stored on disk as CSV text under their original `.xlsx`/`.xls`
        filename, so the extension is just a label — contents are always CSV
        unless the extension is `.json`. The file is loaded into a pandas
        DataFrame named `df` with whatever columns it has. `pd` and `np` are
        available. Assign the final value to a variable named `result`.
        """
        return _run_ledger_compute(code, data_path, root=root)

    return ledger_compute


def _run_ledger_compute(code: str, data_path: str, root: Path | None) -> str:
    try:
        if root is None:
            from src.config.settings import get_settings
            root = Path(get_settings().project_root).resolve()
        rel = data_path.lstrip("/\\")
        candidate = (root / rel).resolve()
        if not candidate.is_file():
            # Fallback: try CWD-relative path (e.g. running tests)
            candidate = Path(rel).resolve()
        if not candidate.is_file():
            return json.dumps({"ok": False, "error": f"file not found at {data_path} (resolved: {candidate})"})

        suffix = candidate.suffix.lower()
        if suffix == ".json":
            records = json.loads(candidate.read_text(encoding="utf-8"))
            df = pd.DataFrame(records)
        else:
            # Every user upload is normalized to CSV-formatted text on disk,
            # regardless of its original extension (.csv, .xlsx, .xls).
            df = pd.read_csv(candidate)

        glb = dict(safe_globals)
        glb.update({
            "df": df,
            "pd": pd,
            "np": np,
            "result": None,
            "_getitem_": default_guarded_getitem,
            "_getattr_": getattr,
            "__builtins__": {
                **safe_globals["__builtins__"],
                "float": float,
                "int": int,
                "round": round,
                "len": len,
                "sum": sum,
                "min": min,
                "max": max,
                "abs": abs,
                "sorted": sorted,
                "list": list,
                "dict": dict,
                "str": str,
                "bool": bool,
                "tuple": tuple,
                "set": set,
                "enumerate": enumerate,
                "zip": zip,
                "map": map,
                "filter": filter,
                "range": range,
                "True": True,
                "False": False,
                "None": None,
            },
        })
        byte_code = compile_restricted(code, "<ledger_sandbox>", "exec")
        exec(byte_code, glb)  # noqa: S102 — restricted bytecode, trusted local input
        return json.dumps({"ok": True, "result": glb.get("result")}, default=str)
    except Exception as exc:
        return json.dumps({"ok": False, "error": f"{type(exc).__name__}: {exc}"})
