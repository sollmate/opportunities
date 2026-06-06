"""Parse DATEV EXTF Buchungsstapel CSV/Excel into a normalized DataFrame."""
from __future__ import annotations

import io
import json
from pathlib import Path

import pandas as pd


def parse_datev(raw: bytes, filename: str) -> pd.DataFrame:
    """Parse raw DATEV export bytes into a normalized ledger DataFrame.

    Supports EXTF CSV (semicolon-separated, ISO-8859-1 header row) and Excel.
    Returns columns: amount, sign, account, contra_account, bu_key,
                     doc_date, booking_text, amount_signed.
    """
    if filename.lower().endswith((".xlsx", ".xls")):
        df = _read_datev_excel(raw)
    else:
        # EXTF format: first row is metadata header, second row is column names
        text = raw.decode("iso-8859-1")
        lines = text.splitlines()
        # Find the header row (starts with "Umsatz")
        header_idx = None
        for i, line in enumerate(lines):
            if line.startswith("Umsatz") or line.startswith('"Umsatz'):
                header_idx = i
                break
        if header_idx is None:
            # Try without EXTF header (plain CSV)
            header_idx = 0
            if lines[0].startswith('"EXTF"') or lines[0].startswith("EXTF"):
                header_idx = 1

        csv_text = "\n".join(lines[header_idx:])
        df = pd.read_csv(
            io.StringIO(csv_text),
            sep=";",
            decimal=",",
            thousands=".",
            encoding="iso-8859-1",
        )

    # Normalize column names
    col_map = _build_column_map(df.columns.tolist())
    df = df.rename(columns=col_map)

    required = ["amount", "sign"]
    for col in required:
        if col not in df.columns:
            return pd.DataFrame()

    # Clean data
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    df["account"] = df.get("account", pd.Series(dtype=str)).astype(str).str.strip()
    df["contra_account"] = df.get("contra_account", pd.Series(dtype=str)).astype(str).str.strip()
    df["bu_key"] = df.get("bu_key", pd.Series(dtype=str)).astype(str).str.strip()
    df["doc_date"] = df.get("doc_date", pd.Series(dtype=str)).astype(str)
    df["booking_text"] = df.get("booking_text", pd.Series(dtype=str)).astype(str)
    df["sign"] = df["sign"].astype(str).str.strip().str.upper()

    # Compute signed amount: S=debit(positive on expense/asset), H=credit(positive on revenue)
    df["amount_signed"] = df.apply(
        lambda r: r["amount"] if r["sign"] == "H" else -r["amount"], axis=1
    )

    return df[["amount", "sign", "account", "contra_account", "bu_key",
               "doc_date", "booking_text", "amount_signed"]]


def _build_column_map(columns: list[str]) -> dict[str, str]:
    """Map DATEV column names (German) to normalized English names."""
    mapping = {}
    for col in columns:
        lower = str(col).lower().strip().strip('"')
        # Main amount column: "Umsatz (ohne Soll/Haben-Kz)" — primary, not "Basis-Umsatz"
        if lower.startswith("umsatz") and "kennz" not in lower:
            mapping[col] = "amount"
        elif "soll/haben" in lower or "soll-haben" in lower or "haben-kennz" in lower:
            mapping[col] = "sign"
        elif lower.startswith("konto") and "gegen" not in lower:
            mapping[col] = "account"
        elif "gegenkonto" in lower:
            mapping[col] = "contra_account"
        elif "bu-schl" in lower or "bu_schl" in lower or "buschl" in lower:
            mapping[col] = "bu_key"
        elif "belegdatum" in lower:
            mapping[col] = "doc_date"
        elif "buchungstext" in lower:
            mapping[col] = "booking_text"
    return mapping


def _read_datev_excel(raw: bytes) -> pd.DataFrame:
    """Read a DATEV Excel export, auto-detecting the header row.

    DATEV exports may carry an EXTF metadata row above the column names, or
    place column names on the first row. Scans the first few rows for the
    "Umsatz" header column and reads from there; falls back to header=0.
    """
    probe = pd.read_excel(io.BytesIO(raw), header=None, nrows=5)
    header_idx = 0
    for i in range(len(probe)):
        cells = [str(c).lower().strip().strip('"') for c in probe.iloc[i].tolist()]
        if any(c.startswith("umsatz") for c in cells):
            header_idx = i
            break
    return pd.read_excel(io.BytesIO(raw), header=header_idx)


def detect_skr(df: pd.DataFrame) -> str:
    """Heuristically detect SKR03 vs SKR04 from account number ranges.

    SKR03 revenue: 8000-8999; SKR04 revenue: 4000-4999.
    """
    accounts = df["account"].dropna()
    numeric_accounts = pd.to_numeric(accounts, errors="coerce").dropna()

    skr03_revenue = numeric_accounts[(numeric_accounts >= 8000) & (numeric_accounts <= 8999)]
    skr04_revenue = numeric_accounts[(numeric_accounts >= 4000) & (numeric_accounts <= 4999)]

    if len(skr03_revenue) > len(skr04_revenue):
        return "SKR03"
    elif len(skr04_revenue) > len(skr03_revenue):
        return "SKR04"
    return "SKR03"  # default


def write_ledger_json(df: pd.DataFrame, root_dir: str, name: str = "ledger.json") -> str:
    """Write the normalized ledger as JSON for the agent's filesystem reads."""
    path = Path(root_dir) / name
    records = df.to_dict(orient="records")
    path.write_text(json.dumps(records, ensure_ascii=False, default=str), encoding="utf-8")
    return f"/{name}"
