---
name: kleinunternehmer-19-ustg
description: Use to check §19 UStG Kleinunternehmer (small-business VAT exemption) status and to detect a mid-year breach of the upper limit. Trigger when prior-year net turnover and current-year turnover are known (or can be computed from revenue accounts). Determines VAT-exemption eligibility (Kleinunternehmerregelung) and whether the status has ended.
license: proprietary
metadata:
  author: sollmate
  version: "2025.1"
  effective_date: "2025-01-01"
  legal_basis: "§ 19 Abs. 1 UStG"
---

# §19 UStG Kleinunternehmer check

Determines whether a business qualifies for the Kleinunternehmerregelung (no Umsatzsteuer
charged, no Vorsteuerabzug) and flags a mid-year loss of status.

## Thresholds (effective 2025-01-01; Jahressteuergesetz 2024, BMF-Schreiben v. 18.3.2025)
Both conditions must hold for the status to apply:
- `prior_year_net_turnover` <= 25.000 € (Vorjahr) — assessed **net** (was 22.000 € *gross* through 2024)
- `current_year_turnover`  <= 100.000 € (laufendes Jahr) — an **actual** ceiling, not a year-end prognosis

Breach rule (key 2025 change): the moment current-year turnover **exceeds 100.000 €**, the
status ends **immediately from the transaction that breaches it** — that transaction and all
subsequent turnover are regelbesteuert (subject to normal VAT). There is no longer a
year-end-prognosis grace mechanism for the upper limit.

## Expected inputs
- `master_data.prior_year_net_turnover`, `master_data.current_year_turnover`.
- If `current_year_turnover` is absent, compute it from a **DATEV-shaped upload**
  (per the user-uploaded-files skill: an `/uploads/<original_name>` with at least
  `account` and `amount` columns — the extension can be `.csv`, `.xlsx`, or `.xls`).
  If no DATEV-shaped upload exists, ask the consultant for the current-year figure
  instead of guessing.
- For the prior-year figure, ask the consultant via the master-data interview if it
  isn't present.

## SKR account anchors (revenue)
| Meaning | SKR03 | SKR04 |
|---|---|---|
| Erlöse 19% USt (Automatikkonto) | 8400 | 4400 |
| Erlöse 7% USt | 8300 | 4300 |
| Erlöse steuerfrei / Kleinunternehmer | 8100 / 8200 | 4100 / 4200 |

Resolve the active SKR variant from `master_data.skr_variant` (it overrides the parser
heuristic). Use the matching account prefixes below.

## Procedure
1. Compute current-year revenue via `ledger_compute` against the DATEV-shaped upload
   (never sum in your head). Example for SKR04:
   `ledger_compute(data_path="/uploads/<original_name>",
                  code="rev = df[df.account.astype(str).str.startswith(('43','44','41','42'))].amount.sum(); result = float(rev)")`
   For SKR03 use the `('83','84','81','82')` prefixes.
2. Compare the computed current-year figure against 100.000 € and the supplied prior-year
   net figure against 25.000 €.
3. Decide:
   - both limits respected → `met=false` (status applies, no advisory action beyond confirmation);
   - prior-year > 25.000 € → status not available this year;
   - current-year > 100.000 € → **breach**: status ended mid-year; use `trigger_id` `KU-19-USTG-BREACH`.
4. If the prior-year net figure is missing, ask one interview question and wait.

## Edge cases
- Turnover is **net** from 2025; do not compare gross ledger sums to the 25.000 € limit
  without isolating the net revenue accounts.
- New businesses (Gründung im laufenden Jahr): only the 100.000 € current-year limit applies;
  there is no prior-year reference period — note this in the rationale.
- A voluntary Verzicht (opting out for Vorsteuerabzug) is an optimization, not this check —
  route that to `judgment-optimization`.

## Output contract (one Trigger)
```json
{
  "trigger_id": "KU-19-USTG" ,
  "kind": "statutory",
  "title": "§19 UStG Kleinunternehmer status",
  "legal_basis": "§ 19 Abs. 1 UStG",
  "threshold_version": "2025.1",
  "met": false,
  "confidence": "high",
  "computed_values": {"prior_year_net_turnover": 0, "current_year_turnover": 0, "breached": false},
  "rationale": "Cite both figures and the two thresholds; if breached, name the breaching point."
}
```
Use `trigger_id` `KU-19-USTG-BREACH` and `met=true` when the 100.000 € ceiling is exceeded.
