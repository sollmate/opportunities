---
name: buchfuehrungspflicht-141-ao
description: Use to check the tax bookkeeping duty (steuerliche Buchführungspflicht) under §141 AO / §241a HGB from turnover and profit. Determines whether the client must move from Einnahmenüberschussrechnung (EÜR) to double-entry bookkeeping (Bilanzierung). Trigger when prior-year turnover and profit are known and the legal form is a Gewerbebetrieb.
license: proprietary
metadata:
  author: sollmate
  version: "2024.1"
  effective_date: "2024-01-01"
  legal_basis: "§ 141 AO; § 241a HGB"
---

# §141 AO / §241a HGB Buchführungspflicht check

Determines whether a gewerblicher Unternehmer crosses into derivative tax bookkeeping duty
(Bilanzierungspflicht) and must leave the EÜR.

## Thresholds (since Wirtschaftsjahr 2024; Wachstumschancengesetz v. 27.3.2024, BGBl 2024 I Nr. 108)
Duty is triggered if **either** limit is exceeded:
- `turnover` > 800.000 € (Umsatzgrenze, § 141 Abs. 1 Satz 1 Nr. 1 AO — raised from 600.000 €), **OR**
- `profit`   > 80.000 €  (Gewinngrenze, § 141 Abs. 1 Satz 1 Nr. 4/5 AO — raised from 60.000 €)

## Important qualifications
- **Auffangtatbestand:** § 141 AO applies **only** if no bookkeeping duty already arises under
  § 140 AO (derivative duty from other laws, e.g. HGB for Kaufleute). Check § 140 first in the rationale.
- **Forward effect:** the duty begins the Wirtschaftsjahr **after** the Finanzamt notifies the
  taxpayer (§ 141 Abs. 2 AO) — **never retroactively**. State this; do not imply an immediate obligation.
- **Freiberufler exempt:** freelancers / freie Berufe (§ 18 EStG) are not subject to § 141 AO
  regardless of turnover or profit. Gate the whole check on `legal_form`.

## Expected inputs
- `master_data.prior_year_profit` (or computed), `master_data.prior_year_net_turnover`
  (or computed from revenue accounts), and `master_data.legal_form`.

## Procedure
1. If `legal_form` indicates a Freiberufler / freie Berufe, return `met=false` with a rationale
   noting the § 141 exemption — do not compute further.
2. Compute turnover via `ledger_compute` over the revenue accounts if no master-data figure is given.
3. Compare turnover vs 800.000 € and profit vs 80.000 €.
4. If either limit is exceeded, set `met=true` and note in the rationale that the duty starts the
   year **after** Finanzamt notification, and that § 140 AO must be ruled out first.

## Output contract (one Trigger)
```json
{
  "trigger_id": "BUCHF-141-AO",
  "kind": "statutory",
  "title": "§141 AO bookkeeping duty (EÜR → Bilanzierung)",
  "legal_basis": "§ 141 AO; § 241a HGB",
  "threshold_version": "2024.1",
  "met": false,
  "confidence": "high",
  "computed_values": {"turnover": 0, "profit": 0, "limb": "none|turnover|profit", "freiberufler": false},
  "rationale": "Cite the figure(s), the exceeded limb, the §140-first qualification, and the forward-effect note."
}
```
