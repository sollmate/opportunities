---
name: voranmeldung-18-ustg
description: Use to determine the correct USt-Voranmeldung rhythm (monatlich/vierteljährlich/Befreiung möglich) under §18 Abs. 2 UStG from the prior-year VAT liability, and to flag a mismatch between the required rhythm and the rhythm the client currently files. Trigger when prior-year VAT liability and the current filing rhythm are known.
license: proprietary
metadata:
  author: sollmate
  version: "2025.1"
  effective_date: "2025-01-01"
  legal_basis: "§ 18 Abs. 2 UStG"
---

# §18 UStG Voranmeldung rhythm check

Derives the statutory Umsatzsteuer-Voranmeldung period from the prior-year VAT liability
(Vorjahres-Zahllast) and flags a rhythm mismatch (e.g. filing monthly when quarterly suffices).

## Thresholds (since 2025; Viertes Bürokratieentlastungsgesetz + Wachstumschancengesetz)
Based on `prior_year_vat_liability` (USt-Zahllast des Vorjahres):
- > 9.000 €            → **monatlich** (monthly) — limit raised from 7.500 €
- 2.000 €–9.000 €      → **vierteljährlich** (quarterly; the default Voranmeldungszeitraum)
- <= 2.000 €           → the Finanzamt **may** befreien (exempt) from Voranmeldungen — limit raised from 1.000 €

Both raises took effect **1.1.2025** (the 9.000 € via BEG IV, BGBl. v. 29.10.2024; the 2.000 €
via the Wachstumschancengesetz).

## Important qualifications
- The ≤ 2.000 € case is a Finanzamt **discretion** ("kann … befreien"), not an automatic
  exemption — phrase the lead as "Befreiung möglich", not "befreit".
- **Gründer-Regelung:** new businesses founded 2021–2026 are **not** forced into monthly filing
  in the start-up years. If the client is a recent Gründung, note this and avoid recommending
  a monthly switch on the start-up turnover alone.

## Expected inputs
- `master_data.prior_year_vat_liability`, `master_data.current_vat_rhythm`
  ("monthly" | "quarterly" | "none").

## Procedure
1. Map the prior-year VAT liability to the required rhythm via the thresholds above.
2. Compare with `current_vat_rhythm`; set `mismatch=true` if they differ.
3. A common advisory win is "currently monthly but quarterly would suffice" → less
   administrative burden. Surface it as the lead.

## Output contract (one Trigger)
```json
{
  "trigger_id": "VORANM-18-USTG",
  "kind": "statutory",
  "title": "§18 UStG Voranmeldung rhythm",
  "legal_basis": "§ 18 Abs. 2 UStG",
  "threshold_version": "2025.1",
  "met": true,
  "confidence": "high",
  "computed_values": {"prior_year_vat_liability": 0, "required_rhythm": "quarterly", "current_rhythm": "monthly", "mismatch": true},
  "rationale": "Cite the liability, the band it falls in, and the required vs. current rhythm."
}
```
Set `met=true` when a mismatch (or a discretionary exemption opportunity) exists.
