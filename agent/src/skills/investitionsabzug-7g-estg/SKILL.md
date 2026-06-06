---
name: investitionsabzug-7g-estg
description: Use to flag §7g EStG opportunities — geringwertige Wirtschaftsgüter (GWG) immediate write-off, the GWG-Sammelposten pool, and the Investitionsabzugsbetrag (IAB). Trigger when asset purchases or planned investments appear in the ledger, when assets sit just above the GWG limit, or when prior-year profit is near the IAB limit.
license: proprietary
metadata:
  author: sollmate
  version: "2025.1"
  effective_date: "2025-01-01"
  legal_basis: "§ 6 Abs. 2 EStG; § 7g EStG"
---

# §7g EStG IAB / GWG check (advisory)

Surfaces depreciation and pre-investment optimization opportunities. This is a **judgment**
skill: tag results `ai_derived`, because the "best" treatment depends on the client's goals.

## Thresholds
- **GWG Sofortabschreibung:** net cost **<= 800 €** per asset (§ 6 Abs. 2 EStG; unchanged since 2018).
- **GWG-Sammelposten (Pool):** net cost **250–1.000 €** (§ 6 Abs. 2a EStG), pool depreciated over 5 years.
- **IAB (Investitionsabzugsbetrag):** up to **50 %** of planned acquisition/production cost
  deductible in advance, subject to a single **profit limit of 200.000 €** in the year *before*
  investment (§ 7g Abs. 1 Satz 2 Nr. 1 Buchst. b EStG; einheitliche Gewinngrenze, JStG 2020).
  Eligible assets: **beweglich, abnutzbar, ≥90 % betrieblich genutzt.**

## SKR account anchors
| Meaning | SKR03 | SKR04 |
|---|---|---|
| GWG | 0480 | 0670 |
| GWG-Sammelposten (250–1.000 €) | 0485 | 0675 |

## Procedure
1. Use `ledger_compute` to total additions on the GWG / pool / asset accounts for the period.
2. Identify items booked **just over 800 € net** — candidates for splitting or timing so they
   qualify for immediate write-off (flag as optimization, not a directive).
3. If `prior_year_profit` < 200.000 €, flag remaining **IAB capacity** for planned investments.
4. Cross-check the ≥90 % business-use and "beweglich/abnutzbar" conditions cannot be verified
   from the ledger alone — state this assumption explicitly and lower confidence accordingly.

Example (SKR04 GWG additions):
`code = "gwg = df[(df.account=='0670') & (df.amount_signed<0)].amount.sum(); result = float(gwg)"`

## Output contract (one Trigger)
```json
{
  "trigger_id": "IAB-GWG-7G-ESTG",
  "kind": "ai_derived",
  "title": "§7g EStG GWG / IAB opportunity",
  "legal_basis": "§ 6 Abs. 2 EStG; § 7g EStG",
  "threshold_version": "2025.1",
  "met": true,
  "confidence": "medium",
  "computed_values": {"gwg_total": 0, "near_threshold_items": [], "iab_capacity": false, "prior_year_profit": 0},
  "rationale": "Cite the computed totals; mark unverifiable eligibility conditions as assumptions."
}
```
Frame any optimization (splitting purchases, IAB vs. lineare AfA) as **options with
trade-offs** for the Steuerberater — never as instructions.
