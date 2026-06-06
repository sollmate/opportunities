---
name: groessenklassen-267-hgb
description: Use to classify a Kapitalgesellschaft into HGB size classes (Kleinstkapitalgesellschaft/klein/mittelgroß/groß) under §267 / §267a HGB to derive disclosure (Offenlegung) and audit (Abschlussprüfung) obligations. Trigger when balance-sheet total, revenue, and average employee count are available for a corporation.
license: proprietary
metadata:
  author: sollmate
  version: "2024.1"
  effective_date: "2024-01-01"
  legal_basis: "§ 267 HGB; § 267a HGB"
---

# §267 HGB Größenklassen check

Assigns a Kapitalgesellschaft (or haftungsbeschränkte Personengesellschaft per § 264a HGB) to a
size class, which governs Offenlegungs- and Prüfungspflichten.

## Thresholds (since GJ 2024; BGBl 2024 I Nr. 120, in force 17.4.2024; Delegierte RL (EU) 2023/2775)
A class is met when at least **two of three** criteria are **not exceeded**:

| Class | Bilanzsumme | Umsatzerlöse | Ø Arbeitnehmer |
|---|---|---|---|
| Kleinst (§ 267a) | 450.000 € | 900.000 € | 10 |
| klein | 7.500.000 € | 15.000.000 € | 50 |
| mittelgroß | 25.000.000 € | 50.000.000 € | 250 |
| groß | exceeds ≥2 of the *mittelgroß* thresholds | | |

The monetary limits were raised ~25 % by the *Zweite[s] Gesetz zur Änderung des DWD-Gesetzes
sowie zur Änderung handelsrechtlicher Vorschriften*, applicable to Geschäftsjahre ab 1.1.2024
(option to apply ab 2023).

## Two-year rule (Beobachtungszeitraum)
A class only **changes** when the criteria are over- or under-shot at **two consecutive**
balance-sheet dates (§ 267 Abs. 4 HGB). Exception: newly formed companies / Umwandlungen are
classified on the **first** balance-sheet date. If only one year of data is available, state the
classification as provisional and flag that the prior-year comparison is needed.

## Expected inputs
- `master_data.balance_sheet_total`, `master_data.employees_avg`, `master_data.legal_form`,
  and revenue (from master data or computed via `ledger_compute`).

## Procedure
1. Confirm `legal_form` is a Kapitalgesellschaft / § 264a entity; otherwise the size classes
   do not apply (return `met=false`, rationale explains scope).
2. If revenue is not supplied via master data, compute Umsatzerlöse via `ledger_compute`
   against a DATEV-shaped upload's `virtual_path` (per the user-uploaded-files skill).
   If no DATEV-shaped upload exists, ask the consultant for the figure.
3. Evaluate the criteria from the smallest class upward; assign the class per the
   "two-of-three not exceeded" rule.
4. Note the two-consecutive-years requirement and whether it is satisfied.

## Output contract (one Trigger)
```json
{
  "trigger_id": "GROESSE-267-HGB",
  "kind": "statutory",
  "title": "§267 HGB size class",
  "legal_basis": "§ 267 HGB; § 267a HGB",
  "threshold_version": "2024.1",
  "met": true,
  "confidence": "high",
  "computed_values": {"size_class": "klein", "balance_sheet_total": 0, "revenue": 0, "employees_avg": 0, "two_year_confirmed": false},
  "rationale": "State which two criteria drove the class and whether the two-year rule is satisfied."
}
```
`met` is `true` whenever a class can be assigned; the advisory value is the resulting
disclosure/audit consequence, which belongs in the LeadPackage.
