"""LangSmith-instrumented behaviour suite for the Tax-Advisory Deep Agent.

Each parametrized case becomes its own LangSmith dataset example + experiment row.
Run them in parallel and stream results to LangSmith with:

    LANGSMITH_TEST_SUITE="tax-advisory TC catalog" \
    LANGSMITH_EXPERIMENT="claude-opus baseline" \
    pytest tests/test_agent_behaviour.py -n auto --langsmith-output

Requires: pytest, pytest-xdist, langsmith[pytest], and the project's Anthropic
+ LANGSMITH_* env (see .env). DATEV fixtures are synthesized in-memory from each
case spec — no CSV files needed.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from langsmith import testing as t

from src.agent.supervisor import build_agent
from src.config.settings import get_settings
from src.parsers.datev_parser import parse_datev, write_ledger_json

PROMPT = (
    "Run all applicable statutory and advisory checks over the ledger and master data, "
    "and return ONLY the TriggerSet as JSON."
)

# SKR-dependent account anchors for the synthetic ledger.
REV = {"SKR03": "8400", "SKR04": "4400"}   # Erlöse 19% USt
GWG = {"SKR03": "0480", "SKR04": "0670"}   # geringwertige Wirtschaftsgüter


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _make_extf(rows: list[dict]) -> bytes:
    """Build a minimal DATEV EXTF Buchungsstapel CSV (ISO-8859-1) from booking rows."""
    captions = [
        "Umsatz (ohne Soll/Haben-Kz)", "Soll/Haben-Kennzeichen", "Konto",
        "Gegenkonto (ohne BU-Schlüssel)", "BU-Schlüssel", "Belegdatum", "Buchungstext",
    ]
    header = '"EXTF";700;21;"Buchungsstapel";11;20260101120000000'
    lines = [header, ";".join(captions)]
    for r in rows:
        amount = f'{r["amount"]:.2f}'.replace(".", ",")  # German decimal comma
        lines.append(";".join([
            amount, r.get("sign", "H"), r["account"],
            "1200", "", "20250115", r.get("text", ""),
        ]))
    return ("\n".join(lines) + "\n").encode("latin-1")


def _tool_calls(result: dict) -> list[str]:
    """Flatten every tool name across the agent's trajectory."""
    names: list[str] = []
    for m in result["messages"]:
        for tc in getattr(m, "tool_calls", []) or []:
            names.append(tc["name"])
    return names


def _try_triggerset(text: str) -> dict | None:
    """Best-effort parse of a TriggerSet JSON object out of the agent's final message."""
    cleaned = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    candidates = [cleaned]
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start != -1 and end != -1:
        candidates.append(cleaned[start:end + 1])
    for c in candidates:
        try:
            obj = json.loads(c)
            if isinstance(obj, dict) and "triggers" in obj:
                return obj
        except Exception:
            continue
    return None


def _setup_root(tmp_path: Path, case: dict) -> None:
    """Synthesize /ledger.json and /master_data.json under the sandbox root."""
    skr = case["skr"]
    rows: list[dict] = []
    if case.get("revenue") is not None:
        rows.append({"amount": case["revenue"], "account": REV[skr], "sign": "H", "text": "Erlöse"})
    for amt in case.get("assets", []):
        rows.append({"amount": amt, "account": GWG[skr], "sign": "S", "text": "GWG Kauf"})
    if not rows:  # ensure at least one booking row so the parser doesn't reject it
        rows.append({"amount": 0.0, "account": REV[skr], "sign": "H", "text": "leer"})

    df = parse_datev(_make_extf(rows), "case.csv")
    write_ledger_json(df, str(tmp_path))

    master = {"skr_variant": skr, **case.get("master", {})}
    Path(tmp_path, "master_data.json").write_text(json.dumps(master), encoding="utf-8")


@pytest.fixture
def sandbox_root(tmp_path, monkeypatch) -> Path:
    """Point both the agent and `ledger_compute` at the per-test tmp_path.

    `ledger_compute` resolves its ledger path via `get_settings().project_root`
    (cached), so we have to swap that attribute for the duration of the test —
    otherwise the tool reads from ./workspace and ignores our synthesized fixture.
    """
    settings = get_settings()
    monkeypatch.setattr(settings, "project_root", str(tmp_path), raising=False)
    return tmp_path


# --------------------------------------------------------------------------- #
# Test Case Catalog (TC-01 .. TC-N2)
# --------------------------------------------------------------------------- #
CASES = [
    # ---- §19 UStG Kleinunternehmer ----
    {"id": "TC-01-KU-under", "skr": "SKR03", "revenue": 40_000,
     "master": {"legal_form": "Einzelunternehmen", "prior_year_net_turnover": 18_000,
                "current_year_turnover": 40_000},
     "expect": {"type": "trigger", "trigger_id": "KU-19-USTG", "met": False}},

    {"id": "TC-02-KU-breach", "skr": "SKR03", "revenue": 120_000,
     "master": {"legal_form": "Einzelunternehmen", "prior_year_net_turnover": 20_000,
                "current_year_turnover": 120_000},
     "expect": {"type": "trigger", "trigger_id": "KU-19-USTG-BREACH", "met": True}},

    # ---- §141 AO Buchführungspflicht ----
    {"id": "TC-03-141-turnover", "skr": "SKR03", "revenue": 850_000,
     "master": {"legal_form": "Einzelunternehmen", "prior_year_net_turnover": 850_000,
                "prior_year_profit": 50_000},
     "expect": {"type": "trigger", "trigger_id": "BUCHF-141-AO", "met": True}},

    {"id": "TC-04-141-profit", "skr": "SKR03", "revenue": 300_000,
     "master": {"legal_form": "Einzelunternehmen", "prior_year_net_turnover": 300_000,
                "prior_year_profit": 90_000},
     "expect": {"type": "trigger", "trigger_id": "BUCHF-141-AO", "met": True}},

    # ---- §267 HGB Größenklassen ----
    {"id": "TC-05-267-medium", "skr": "SKR04", "revenue": 16_000_000,
     "master": {"legal_form": "GmbH", "balance_sheet_total": 8_000_000,
                "current_year_turnover": 16_000_000, "employees_avg": 60},
     "expect": {"type": "trigger", "trigger_id": "GROESSE-267-HGB", "met": True}},

    {"id": "TC-06-267-small", "skr": "SKR04", "revenue": 2_000_000,
     "master": {"legal_form": "GmbH", "balance_sheet_total": 1_000_000,
                "current_year_turnover": 2_000_000, "employees_avg": 10},
     "expect": {"type": "trigger", "trigger_id": "GROESSE-267-HGB", "met": True}},

    # ---- §7g EStG GWG / IAB (ai_derived) ----
    {"id": "TC-07-7g-gwg-split", "skr": "SKR04", "revenue": 200_000,
     "assets": [820.0, 950.0, 1_100.0],
     "master": {"legal_form": "GmbH", "current_year_turnover": 200_000, "prior_year_profit": 80_000},
     "expect": {"type": "trigger_prefix", "prefix": "IAB-GWG-7G-ESTG"}},

    {"id": "TC-08-7g-iab", "skr": "SKR04", "revenue": 500_000, "assets": [60_000.0],
     "master": {"legal_form": "GmbH", "current_year_turnover": 500_000, "prior_year_profit": 150_000},
     "expect": {"type": "trigger_prefix", "prefix": "IAB-GWG-7G-ESTG"}},

    # ---- §18 UStG Voranmeldung rhythm ----
    {"id": "TC-09-18-monthly", "skr": "SKR03", "revenue": 400_000,
     "master": {"legal_form": "GmbH", "prior_year_vat_liability": 10_000,
                "current_vat_rhythm": "quarterly"},
     "expect": {"type": "trigger", "trigger_id": "VORANM-18-USTG", "met": True}},

    {"id": "TC-10-18-mismatch", "skr": "SKR03", "revenue": 150_000,
     "master": {"legal_form": "GmbH", "prior_year_vat_liability": 3_000,
                "current_vat_rhythm": "monthly"},
     "expect": {"type": "trigger", "trigger_id": "VORANM-18-USTG", "met": True}},

    # ---- fuzzy: multi-signal synthesis ----
    {"id": "TC-11-synth", "skr": "SKR03", "revenue": 95_000, "assets": [900.0, 1_200.0, 2_500.0],
     "master": {"legal_form": "Einzelunternehmen", "prior_year_net_turnover": 24_000,
                "current_year_turnover": 95_000, "prior_year_vat_liability": 4_000,
                "current_vat_rhythm": "quarterly"},
     "expect": {"type": "trigger_prefix", "prefix": "SYNTH-"}},

    # ---- fuzzy: judgment optimization (Kleinunternehmer-Verzicht for Vorsteuer) ----
    {"id": "TC-12-opt-verzicht", "skr": "SKR03", "revenue": 20_000, "assets": [15_000.0],
     "master": {"legal_form": "Einzelunternehmen", "prior_year_net_turnover": 18_000,
                "current_year_turnover": 20_000},
     "expect": {"type": "trigger_prefix", "prefix": "OPT-"}},

    # ---- negative cases ----
    {"id": "TC-N1-clean", "skr": "SKR04", "revenue": 300_000,
     "master": {"legal_form": "GmbH", "balance_sheet_total": 500_000,
                "prior_year_net_turnover": 300_000, "current_year_turnover": 300_000,
                "prior_year_profit": 40_000, "employees_avg": 5,
                "prior_year_vat_liability": 5_000, "current_vat_rhythm": "quarterly"},
     "expect": {"type": "no_active"}},

    {"id": "TC-N2-interview", "skr": "SKR03", "revenue": 60_000,
     "master": {},  # incomplete → required fields missing → agent should ask
     "expect": {"type": "interview"}},
]


@pytest.mark.langsmith(output_keys=["expect"])
@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_agent_behaviour(sandbox_root, case):
    _setup_root(sandbox_root, case)
    agent = build_agent(str(sandbox_root))

    t.log_inputs({"case": case["id"], "skr": case["skr"], "master": case.get("master", {})})
    result = agent.invoke({"messages": [{"role": "user", "content": PROMPT}]})
    final = result["messages"][-1].content
    t.log_outputs({"final": final})

    exp = case["expect"]

    # Interview case: agent should ask for missing master data, not finalize a TriggerSet.
    if exp["type"] == "interview":
        ts = _try_triggerset(final)
        asked = ("?" in final) or ts is None
        assert asked, f"expected an interview question, got a finalized answer: {final[:200]}"
        t.log_feedback(key="asked_for_master_data", score=float(asked))
        return

    # Behavioural assertion shared by all computational cases: no LLM mental math.
    assert "ledger_compute" in _tool_calls(result), "agent must compute figures via ledger_compute"

    ts = _try_triggerset(final)
    assert ts is not None, f"could not parse a TriggerSet from final message: {final[:200]}"
    triggers = ts.get("triggers", [])

    if exp["type"] == "trigger":
        match = next((x for x in triggers if x.get("trigger_id") == exp["trigger_id"]), None)
        assert match is not None, \
            f"{exp['trigger_id']} did not fire; got {[x.get('trigger_id') for x in triggers]}"
        assert bool(match.get("met")) == exp["met"], \
            f"{exp['trigger_id']} met={match.get('met')}, expected {exp['met']}"
    elif exp["type"] == "trigger_prefix":
        assert any(str(x.get("trigger_id", "")).startswith(exp["prefix"]) for x in triggers), \
            f"no trigger with prefix {exp['prefix']!r}; got {[x.get('trigger_id') for x in triggers]}"
    elif exp["type"] == "no_active":
        active = [x.get("trigger_id") for x in triggers if x.get("met")]
        assert not active, f"expected no active (met=true) triggers, got {active}"

    # Soft signals — logged as feedback, don't fail the test.
    t.log_feedback(key="has_disclaimer", score=float("StBerG" in (ts.get("disclaimer") or "")))
    t.log_feedback(key="trigger_count", score=float(len(triggers)))
