"""The ONE custom tool: a restricted code sandbox for ledger aggregation.

Uses RestrictedPython to compile a safe AST subset, then exec it with a tightly
whitelisted namespace exposing only `df` (the ledger DataFrame), `pd`, and `np`.

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
def ledger_compute(code: str, ledger_path: str = "/ledger.json") -> str:
    """Run a small Python snippet over the normalized DATEV ledger and return JSON.

    A pandas DataFrame named `df` is preloaded with columns:
    amount, sign, account, contra_account, bu_key, doc_date, booking_text, amount_signed.
    `pd` and `np` are available. Assign the final value to a variable named `result`.

    Example:
        code = "rev = df[df.account.str.startswith(('84','44'))].amount.sum(); result = float(rev)"
    """
    try:
        from src.config.settings import get_settings
        root = Path(get_settings().project_root).resolve()
        rel = ledger_path.lstrip("/\\")
        candidate = (root / rel).resolve()
        if not candidate.is_file():
            # Fallback: try CWD-relative path (e.g. running tests)
            candidate = Path(rel).resolve()
        if not candidate.is_file():
            return json.dumps({"ok": False, "error": f"ledger not found at {ledger_path} (resolved: {candidate})"})

        records = json.loads(candidate.read_text(encoding="utf-8"))
        df = pd.DataFrame(records)

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
