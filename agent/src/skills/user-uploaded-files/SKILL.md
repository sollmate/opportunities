---
name: user-uploaded-files
description: |
  Read when the user attaches CSV or Excel files mid-session. Tells you where uploads
  live in the VFS (/uploads/), how the index file works, how to parse the normalized
  CSV form, and the paging rule for fully reading large files.
license: internal
metadata:
  version: 2025.1
  effective_date: 2025-01-01
  legal_basis: internal data-handling policy
---

# User-Uploaded Files

Users can attach CSV (`.csv`) or Excel (`.xlsx`, `.xls`) files at any point in the session
via the `/tax-advisory/session/{id}/file` endpoint. Every upload lands under `/uploads/`
in your virtual filesystem.

## Where to look

- `/uploads/_index.json` — the canonical catalog. Read this FIRST whenever you suspect a
  user has provided extra data.
- `/uploads/<stem>.csv` — the normalized, UTF-8 CSV that you should actually read.
- `/uploads/<original_name>` — the untouched raw upload (binary for Excel); only useful
  for byte-level provenance, do NOT try to read it as text if it's `.xlsx`.

`/uploads/_index.json` is an array of entries:

```
[
  {
    "original_name": "rechnungen-q1.xlsx",
    "virtual_path": "/uploads/rechnungen-q1.csv",
    "raw_virtual_path": "/uploads/rechnungen-q1.xlsx",
    "rows": 412,
    "columns": ["Datum", "Betrag", "Kunde", ...],
    "parse_error": null,
    "uploaded_at": "2026-06-06T10:30:00+00:00"
  }
]
```

If `parse_error` is set, the file could not be parsed — surface the error to the user
and do not try to compute over it.

## How to read

1. `read_file("/uploads/_index.json")` to see what's available and the schema of each.
2. For each relevant entry, `read_file(entry.virtual_path)` to get the CSV.
3. KEEP READING. The built-in `read_file` returns a slice. If the result looks
   truncated (smaller than `rows` would imply, or ends mid-row), call it again with
   `offset=<last_offset + chunk_size>` until you reach EOF. Never stop after the first
   chunk for a file with many rows.

## When to push data into ledger_compute

If a CSV contains booking-style data that you need to aggregate, do NOT compute over it
mentally. You have two safe paths:

- Treat it as supplementary context only (read the rows, cite specific entries by row
  index in your rationale, no aggregation).
- If it has the same columns as `/ledger.json`, ask the user whether to merge it into
  the ledger via a second upload through the normal `POST /session` flow — do not merge
  it yourself silently.

## Provenance

Any figure that is influenced by an upload MUST cite `uploaded_at` and `original_name`
from the index in the trigger's `rationale` so the Steuerberater can trace it.

## Output contract

This skill does NOT produce a Trigger. It tells you how to safely consume user uploads.
