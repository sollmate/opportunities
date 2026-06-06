---
name: user-uploaded-files
description: |
  Read whenever the user attaches CSV or Excel files. Uploads are the PRIMARY data
  source — there is no canonical `/ledger.json`. Tells you where uploads live, how
  the index works, when an upload is DATEV-shaped (and therefore drives statutory
  checks), and how to feed `ledger_compute` with the right `data_path`.
license: internal
metadata:
  version: 2025.2
  effective_date: 2025-01-01
  legal_basis: internal data-handling policy
---

# User-Uploaded Files

Users can attach CSV (`.csv`) or Excel (`.xlsx`, `.xls`) files either at session creation
(`POST /tax-advisory/session`) or mid-session (`POST /tax-advisory/session/{id}/file`).
Both endpoints write **one** file per upload at `/uploads/<original_name>` containing
the data in canonical CSV-formatted text (regardless of the original extension), then
append an entry to `/uploads/_index.json`.

There is NO `/ledger.json` — every data file the user has is under `/uploads/`.

## Where to look

- `/uploads/_index.json` — the canonical catalog. Read this FIRST on every turn.
- `/uploads/<original_name>` — the upload's contents as UTF-8 CSV text. The file
  carries its original extension (`.csv`, `.xlsx`, `.xls`) as a label only; the
  bytes on disk are always CSV.

`/uploads/_index.json` is an array of entries:

```
[
  {
    "original_name": "rechnungen-q1.xlsx",
    "virtual_path": "/uploads/rechnungen-q1.xlsx",
    "rows": 412,
    "columns": ["Datum", "Betrag", "Kunde", ...],
    "parse_error": null,
    "uploaded_at": "2026-06-06T10:30:00+00:00"
  }
]
```

If `parse_error` is set, the file could not be parsed — surface the error to the user
and do not try to compute over it.

## DATEV-shaped uploads

An upload is "DATEV-shaped" — and therefore usable by the statutory skills
(Kleinunternehmer §19, §7g IAB/GWG, §141 AO, §267 HGB, §18 UStG) — when its
`columns` include at least `account` and either `amount` or `amount_signed`. Useful
extras: `sign`, `contra_account`, `bu_key`, `doc_date`, `booking_text`.

- If exactly one upload is DATEV-shaped, use its `virtual_path` for every statutory
  `ledger_compute` call.
- If multiple are DATEV-shaped, ask the user which one represents the current ledger
  before computing.
- If none are DATEV-shaped, the statutory checks are **non-runnable** — say so to the
  user, ask whether to ingest the relevant figures from master data or to upload a
  ledger, and skip those triggers (do not fabricate them).

Non-DATEV uploads are still useful as supplementary context (rechnungen, anlagen,
bankauszüge). Read them, cite specific rows by index in your rationale, but do not
combine them into the statutory checks without asking.

## How to read

1. `read_file("/uploads/_index.json")` to see what's available.
2. For each relevant entry, `read_file(entry.virtual_path)` to get the CSV text.
3. KEEP READING. The built-in `read_file` returns a slice. If the result looks
   truncated (smaller than `rows` would imply, or ends mid-row), call it again with
   `offset=<last_offset + chunk_size>` until you reach EOF. Never stop after the first
   chunk for a file with many rows.

## Computing over an upload

`ledger_compute` takes `data_path` (path to a user upload). Pass the upload's
`virtual_path` directly; the file is loaded as CSV regardless of its extension.

```
ledger_compute(
  data_path="/uploads/buchungen-2025.xlsx",
  code="rev = df[df.account.astype(str).str.startswith(('84','44'))].amount.sum(); result = float(rev)"
)
```

`df` has whatever columns the file has — always coerce account strings with
`.astype(str)` before `.str.startswith(...)` because pandas may infer them as integers.

## Provenance

Any figure influenced by an upload MUST cite `uploaded_at` and `original_name` from the
index in the trigger's `rationale` so the Steuerberater can trace it.

## Output contract

This skill does NOT produce a Trigger. It tells you how to safely consume user uploads.
