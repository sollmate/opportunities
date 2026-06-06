# COMPLIANCE.md

Compliance posture for the Tax-Advisory Deep Agent (ADR-006 proof-of-concept). This document
covers three regimes: the **Steuerberatungsgesetz (StBerG)**, the **GoBD**, and the **GDPR /
DSGVO**. It is a living document; review it on every threshold update and before any change to
how client data is stored or transmitted.

> **One-line summary:** the service is a *preparatory, mechanical* decision-support tool that
> produces draft triggers and leads for a qualified Steuerberater to review. It never files,
> signs, or renders final tax advice.

---

## 1. Steuerberatungsgesetz (StBerG)

### 1.1 The reserved activity
§ 1 and § 5 StBerG reserve the *geschäftsmäßige Hilfeleistung in Steuersachen* (commercial
assistance in tax matters) to qualified persons — Steuerberater, Rechtsanwälte, Wirtschaftsprüfer
and the bodies named in § 3 StBerG. Software that *renders* tax advice to a taxpayer without such
a professional in the loop would intrude on this reserved activity.

### 1.2 How the service stays on the right side of the line
The service is positioned strictly as a **preparatory tool** for a Steuerberater, not as an
adviser to the taxpayer:

- **No final advice.** Output is framed as a *Hinweis / Lead für die Beraterprüfung* — a draft
  observation, never a conclusion the client may act on directly.
- **No filing or signing.** The service must not auto-file, auto-sign, or transmit anything to
  the Finanzamt or to ELSTER. There is no submission path in the codebase, by design.
- **Human-in-the-loop is structural, not cosmetic.** The `LeadPackage` schema hard-codes
  `review_required = True`, and every `TriggerSet` carries the German disclaimer:
  *"Entscheidungsunterstützung — keine Steuerberatung i.S.d. StBerG. Alle Ergebnisse sind vor
  Verwendung durch eine/n Steuerberater/in zu prüfen."*
- **Mechanical computation only.** All figures come from the deterministic `ledger_compute`
  sandbox; the model interprets and drafts, but does not invent numbers or final positions.

### 1.3 Design rules that enforce this
1. The agent system prompts forbid filing, signing, or finalizing any tax matter.
2. Optimization output (`judgment-optimization`) must be presented as **options with trade-offs**,
   never as a single directive.
3. Any future "send to ELSTER", "generate signed Voranmeldung", or "auto-submit" feature is **out
   of scope** for this service and would require separate legal review.

### 1.4 Watch item — 9. StBÄndG
The 9. Steuerberatungsänderungsgesetz reform includes parts due to take effect **1 September 2026**
that may adjust the catalogue of permissible activities. Monitor and re-assess this section before
that date; do not assume today's boundary is static.

---

## 2. GoBD (Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern …)

Reference: BMF-Schreiben v. 28.11.2019, last amended 14.7.2025. The GoBD set out principles for
the orderly keeping of electronically supported books and records. The service is a processing
component, so the relevant principles map onto its design as follows.

| GoBD principle | Requirement | How the service satisfies it |
|---|---|---|
| **Nachvollziehbarkeit / Nachprüfbarkeit** | A knowledgeable third party must be able to follow each step within reasonable time | LangSmith captures the full LLM/tool/subagent trace; every figure is traceable to a `ledger_compute` call with the snippet that produced it |
| **Vollständigkeit** | Records must be complete | The DATEV EXTF Buchungsstapel is parsed in full into the canonical ledger; no booking rows are silently dropped (parse failures raise `422`, not partial ingestion) |
| **Richtigkeit** | Records must reflect the actual transactions | The parser preserves Soll/Haben signs and amounts; all aggregation is deterministic (RestrictedPython, no LLM arithmetic) |
| **Unveränderbarkeit** | Once recorded, entries must not be alterable without trace | The trigger log is append-only and echoed to LangSmith metadata; the per-request virtual filesystem is not edited in place after computation |
| **Zeitgerechtigkeit** | Timely recording | Processing is per-upload and synchronous within the session |
| **Ordnung** | Orderly, retrievable structure | Canonical ledger schema + versioned skills + reference SKR maps give a fixed, documented structure |
| **Verfahrensdokumentation** | A documented description of the procedure | See `docs/VERFAHRENSDOKUMENTATION.md` — this codebase is the start of that documentation |

**Audit trail.** The combination of (a) LangSmith traces, (b) the append-only trigger log, and
(c) the deterministic sandbox (every monetary figure reproducible from its snippet) supplies the
*Nachvollziehbarkeit* and *Unveränderbarkeit* the GoBD require.

**Caveat.** GoBD retention duties (Aufbewahrungspflichten) attach to the *taxpayer's* books, not
to this preparatory tool. The PoC is stateless and does not itself serve as the system of record;
that remains DATEV / the client's bookkeeping system.

---

## 3. GDPR / DSGVO

### 3.1 Data-minimizing design
- **Stateless MVP.** No database. The canonical ledger and master data live only in the
  per-request virtual filesystem and are discarded when the request completes. This minimizes
  personal-data retention by construction.
- **Purpose limitation.** Data is processed solely to derive advisory triggers for the
  consultant; there is no secondary use, profiling, or training on client data.

### 3.2 The LangSmith exposure — the key control
LangSmith tracing is essential for the GoBD audit trail, but traces can contain input/output
payloads that include personal and financial data.

- **Do not enable input/output payload logging for real client data** without (a) a Data
  Processing Agreement (Auftragsverarbeitungsvertrag) with the tracing provider and (b) a PII review.
- For EU data residency, point `LANGSMITH_ENDPOINT` at the EU host
  (`https://eu.api.smith.langchain.com`).
- For production, prefer logging **metadata and computation provenance** over raw payloads.

### 3.3 Roles (to confirm before production)
In a deployment, the Steuerberater / Kanzlei is typically the **Verantwortlicher**
(controller) and any model/tracing provider is an **Auftragsverarbeiter** (processor). Confirm
the controller/processor mapping and put the corresponding AVV/DPA in place before any real
client data is processed. The Azure OpenAI and LangSmith DPAs must be reviewed for the chosen
region and data-handling settings.

---

## 4. Compliance checklist (pre-production gate)

- [ ] No code path can file, sign, or transmit to the Finanzamt / ELSTER.
- [ ] Every `TriggerSet` carries the StBerG disclaimer and every `LeadPackage` has `review_required = True`.
- [ ] All monetary figures originate from `ledger_compute` (no LLM arithmetic).
- [ ] LangSmith payload logging is disabled for client data, or a DPA + PII review is complete.
- [ ] `LANGSMITH_ENDPOINT` set to the EU host if EU residency is required.
- [ ] Skill `version` / `effective_date` frontmatter reviewed against current law.
- [ ] Controller/processor roles documented and AVV/DPA signed.
- [ ] 9. StBÄndG (parts due 1.9.2026) reviewed for impact on permissible activities.
