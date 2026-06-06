---
name: multi-signal-synthesis
description: Use to synthesize several weak signals across the ledger (revenue trend, account mix, unusual postings, proximity to statutory thresholds, master-data context) into higher-order advisory observations that no single statutory check captures. Use after the deterministic statutory checks have run, to connect them.
license: proprietary
metadata:
  author: sollmate
  version: "2025.1"
  legal_basis: "n/a (analytisch)"
---

# Multi-signal synthesis (fuzzy)

Combines individually inconclusive signals into a single advisory observation. This is an
**analytical** skill with no statutory threshold of its own — every result is `ai_derived`.

## When to use
After the statutory checks, to connect signals such as:
- current-year turnover **approaching** (but not breaching) the §19 UStG 100.000 € ceiling, **plus**
- rising asset purchases (§7g territory), **plus**
- a quarterly VAT rhythm that may soon flip to monthly (§18 UStG)
→ a proactive "you are trending toward Regelbesteuerung + higher compliance load" observation.

## Procedure
1. Pull each underlying figure with `ledger_compute` — **never estimate a number**.
2. State the individual signals, then the combined observation in one or two sentences.
3. Set `confidence` from **signal agreement**: several aligned signals → "medium"; a single
   soft signal → "low". Reserve "high" for cases where the synthesis is near-certain.
4. Keep it observational. If it becomes a recommendation with trade-offs, hand off to
   `judgment-optimization`.

## Output contract (one Trigger)
```json
{
  "trigger_id": "SYNTH-<short-slug>",
  "kind": "ai_derived",
  "title": "<the higher-order observation>",
  "legal_basis": "analytical",
  "threshold_version": "n/a",
  "met": true,
  "confidence": "medium",
  "computed_values": {"signals": {}},
  "rationale": "List the signals (each with its computed figure) and why together they matter."
}
```
Every figure in `computed_values.signals` must trace to a `ledger_compute` call.
