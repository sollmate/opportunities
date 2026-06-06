# VERFAHRENSDOKUMENTATION.md

GoBD-style process documentation (Verfahrensdokumentation) for the Tax-Advisory Deep Agent
(ADR-006 proof-of-concept). It describes *what the procedure does, how data flows through it,
and which controls make it nachvollziehbar (traceable) and unveränderbar (tamper-evident)*.

This document is the start of the Verfahrensdokumentation required by the GoBD
(BMF-Schreiben v. 28.11.2019, last amended 14.7.2025). It is versioned with the codebase.

| | |
|---|---|
| **System** | Tax-Advisory Deep Agent (standalone FastAPI service, `python app.py`) |
| **Version** | 0.1.0 (PoC) |
| **Status** | Proof of concept — local, single-process, stateless, no database |
| **Owner** | sollmate (to be confirmed per deployment) |
| **Related docs** | `COMPLIANCE.md`, `ARCHITECTURE.md`, `TEST_CASE_CATALOG.md` |

---

## 1. Purpose and scope (Zielsetzung)

The procedure ingests a DATEV transaction export and company master data, runs a LangChain Deep
Agent over them, and produces a **confidence-tagged set of advisory triggers** plus draft lead
packages for a human Steuerberater to review.

**In scope:** ingestion, normalization, deterministic computation, statutory and AI-derived
trigger generation, lead drafting, tracing.

**Out of scope (by design):** filing, signing, or transmitting anything to the Finanzamt;
persistent storage of client data; final tax advice. See `COMPLIANCE.md` §1 (StBerG).

---

## 2. System overview (Systemüberblick)

A single FastAPI process exposes two endpoints under `/tax-advisory`:
- `POST /session` — upload the DATEV export (+ optional master-data file), normalize into the
  virtual filesystem, return a session id and any missing master-data fields.
- `POST /session/{id}/message` — stream the agent's reasoning, master-data interview questions,
  and the final trigger set over Server-Sent Events.

Core components:
- **Parser** (`datev_parser.py`) — DATEV EXTF Buchungsstapel (CSV/Excel) → canonical ledger JSON.
- **Deep Agent supervisor** (`supervisor.py`) — orchestration via `deepagents.create_deep_agent`.
- **Single custom tool** (`code_sandbox.py`) — RestrictedPython sandbox; performs **all** numeric
  aggregation over the ledger.
- **Skills** (`src/skills/*/SKILL.md`) — seven versioned, dated statutory/analytical checks,
  loaded by progressive disclosure.
- **Reference maps** (`skr03_map.json`, `skr04_map.json`) — chart-of-accounts anchors.
- **Tracing** (LangSmith) — full run trace = the audit trail.

The architecture diagram lives in `ARCHITECTURE.md`.

---

## 3. Data flow (Datenfluss) — the auditable chain

```
DATEV EXTF export ─┐
                   ├─► parse_datev ─► canonical ledger ─► /ledger.json (virtual FS)
master-data file ──┘                                     /master_data.json
                                                              │
                              skills (dated thresholds) ◄─────┤  read by supervisor
                              reference SKR maps        ◄─────┤
                                                              ▼
                              ledger_compute (RestrictedPython) ──► every monetary figure
                                                              │
                       statutory checks (supervisor)          │
                       fuzzy analysis (general-purpose subagent)
                                                              ▼
                              TriggerSet (triggers + lead packages + disclaimer)
                                                              │
                              append-only trigger log + LangSmith trace
```

Each stage is recorded:
1. **Ingestion** — the parser reads the EXTF metadata line, column captions, and booking rows;
   German decimal formatting and Soll/Haben signs are normalized; parse failure → HTTP 422 (no
   partial ingestion).
2. **Normalization** — a fixed canonical schema (`amount, sign, account, contra_account, bu_key,
   doc_date, booking_text, amount_signed`) written to `/ledger.json`.
3. **Computation** — every sum/ratio/threshold comparison runs in `ledger_compute`; the executed
   snippet and its JSON result are part of the trace. The LLM performs **no** arithmetic.
4. **Trigger generation** — each skill's dated thresholds and output contract govern the resulting
   `Trigger`; the `threshold_version` is recorded on the trigger.
5. **Logging** — every emitted trigger is appended (append-only) to the in-memory session log and
   echoed to LangSmith metadata.

---

## 4. Controls mapped to GoBD principles (Kontrollen)

| Principle | Control in this procedure |
|---|---|
| Nachvollziehbarkeit / Nachprüfbarkeit | LangSmith trace of every LLM/tool/subagent step; each figure reproducible from its `ledger_compute` snippet |
| Vollständigkeit | Full parse of the Buchungsstapel; no silent row dropping; empty result rejected |
| Richtigkeit | Sign/amount preservation in the parser; deterministic, LLM-free computation |
| Unveränderbarkeit | Append-only trigger log; LangSmith metadata; no in-place edits to computed state |
| Ordnung | Fixed canonical schema; versioned skills; documented SKR reference maps |
| Verfahrensdokumentation | This document, versioned with the code |

---

## 5. Determinism and reproducibility

- The Azure OpenAI model is configured with `temperature=0` for stable statutory checks.
- All dependency versions are pinned in `requirements.txt` (deepagents and the v3 streaming
  protocol are beta and evolve quickly).
- A given (ledger, master data, skill versions) input is expected to reproduce the same computed
  figures, because the figures come from the deterministic sandbox rather than the model.

---

## 6. Statutory thresholds and versioning (load-bearing)

German tax thresholds change frequently (several 2024–2025 raises). Each `SKILL.md` carries
`metadata.version`, `effective_date`, and `legal_basis` in its frontmatter, and every `Trigger`
records the `threshold_version` it used. **These dates are load-bearing.** Institute a review
cadence (at minimum: each turn of the tax year, and on any relevant Gesetzesänderung) so embedded
numbers never silently go stale. The currently embedded versions:

| Skill | Version | Effective | Legal basis |
|---|---|---|---|
| kleinunternehmer-19-ustg | 2025.1 | 2025-01-01 | § 19 Abs. 1 UStG |
| buchfuehrungspflicht-141-ao | 2024.1 | 2024-01-01 | § 141 AO; § 241a HGB |
| groessenklassen-267-hgb | 2024.1 | 2024-01-01 | § 267 HGB; § 267a HGB |
| investitionsabzug-7g-estg | 2025.1 | 2025-01-01 | § 6 Abs. 2 EStG; § 7g EStG |
| voranmeldung-18-ustg | 2025.1 | 2025-01-01 | § 18 Abs. 2 UStG |
| multi-signal-synthesis | 2025.1 | — | analytical |
| judgment-optimization | 2025.1 | — | advisory |

---

## 7. Data protection and retention

- The PoC is **stateless**: the virtual filesystem holding `/ledger.json` and `/master_data.json`
  is discarded when the request completes; there is no database.
- GoBD retention duties attach to the taxpayer's books in the system of record (DATEV / the
  client's bookkeeping), **not** to this preparatory tool.
- LangSmith input/output payload logging must be disabled for real client data absent a DPA and
  PII review. See `COMPLIANCE.md` §3.

---

## 8. Roles and responsibilities (Rollen)

| Role | Responsibility |
|---|---|
| Steuerberater / Kanzlei | Reviews every trigger and lead before any client use; renders the actual advice; typically the GDPR controller (Verantwortlicher) |
| Consultant (operator) | Uploads the DATEV export, answers the master-data interview |
| System owner | Maintains threshold versions, dependency pins, and this documentation |
| Model / tracing provider | Processor (Auftragsverarbeiter) under an AVV/DPA |

---

## 9. Change management (Änderungsverfahren)

- Changes to thresholds are made **only** by editing the relevant `SKILL.md` frontmatter and body,
  bumping `metadata.version`, and recording the change here (§6 table) and in version control.
- Dependency bumps require re-running the labeled test dataset (`scripts/run_test_dataset.py`,
  TC-01…TC-N2) before release.
- This document is reviewed on every threshold update and before any change to data storage,
  transmission, or the StBerG boundary.

---

## 10. Limitations (Einschränkungen)

- **RestrictedPython is not an OS sandbox** — acceptable for the local PoC fed by our own LLM over
  our own data; escalate to subprocess/seccomp/microVM isolation before accepting untrusted uploads
  or exposing beyond localhost.
- **Heuristic SKR detection** (8xxx vs 4xxx) can misclassify edge cases; the master-data
  `skr_variant` always overrides the heuristic when supplied.
- **Beta dependencies** — `deepagents` 0.6.7 and the v3 streaming protocol may change; versions
  are pinned and must be re-tested on any bump.
