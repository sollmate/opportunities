---
name: master-data-from-db
description: |
  Load this when the supervisor needs company master data from the Postgres CRM. Tells
  you how to call the `fetch_master_data` tool, what it writes, and how to handle
  missing rows. The tool is hardcoded to query `crm.client` by `client_id` (uuid).
license: internal
metadata:
  version: 2025.1
  effective_date: 2025-01-01
  legal_basis: internal data-source policy
---

# Master-Data from Postgres

`fetch_master_data(client_id: str)` runs `SELECT * FROM crm.client WHERE client_id = $1`
against the Postgres database referenced by `DATABASE_URL`, then writes the full row to
`/master_data.json` as a flat JSON object. Column names come straight from the DB; no
schema validation is performed.

Typical columns in `crm.client` (all may be NULL except `client_id`, `client_type`,
`display_name`, `status`, `created_at`, `updated_at`):

- `client_id` (uuid, primary key)
- `client_type`, `status` (enum-like text)
- `display_name`, `legal_name`
- `industry_id` (int → join `ref.industry` if needed)
- `tax_number`, `vat_id`
- `register_court`, `register_number`
- `website`, `founded_on`
- `created_at`, `updated_at`

## When to call it

- The user references a client by uuid (`client_id`) and `/master_data.json` is missing
  or stale.
- The supervisor's interview step is about to ask for fields that live in the DB.

Do NOT call it on every turn. If `/master_data.json` already has the fields you need,
skip it.

## How to call it

```
fetch_master_data(client_id="11111111-2222-3333-4444-555555555555")
```

Returned JSON:

- `ok: true` + `virtual_path: "/master_data.json"` + `columns` + `data`
- or `ok: false` + `error: "..."`

On success, read `/master_data.json` next.

## Tax-advisory fields NOT in this DB

`crm.client` does NOT carry the tax/financial fields some statutory skills need
(`legal_form`, `skr_variant`, `prior_year_net_turnover`, `current_year_turnover`,
`prior_year_profit`, `prior_year_vat_liability`, `current_vat_rhythm`,
`balance_sheet_total`, `employees_avg`). If a check needs one of these and it is not in
`/master_data.json`, ask the user via the interview procedure — do NOT invent values.

## Error handling

- `DATABASE_URL is not configured` → tell the user the DB is offline; fall back to interview.
- `no row in crm.client for client_id=…` → ask the user to confirm the uuid; do NOT guess.
- `psycopg is not installed` → infrastructure bug; report and fall back to interview.
- Any other exception → report verbatim, do not retry more than once.

## Provenance

When a Trigger uses fields from this tool, add a short `data_source` note in the
trigger's rationale (e.g. *"crm.client row loaded for client_id=<uuid>"*). Required for
the GoBD audit trail.
