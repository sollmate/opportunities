import json
from pathlib import Path

from src.agent.tools.code_sandbox import ledger_compute
from src.parsers.datev_parser import parse_datev, write_ledger_json


def test_sandbox_blocks_import(tmp_path, monkeypatch):
    raw = Path("tests/fixtures/tc01_kleinunternehmer_under.csv").read_bytes()
    df = parse_datev(raw, "tc01.csv")
    monkeypatch.chdir(tmp_path)
    write_ledger_json(df, ".")
    res = json.loads(ledger_compute.invoke(
        {"code": "import os\nresult = 1", "ledger_path": "/ledger.json"}
    ))
    assert res["ok"] is False


def test_sandbox_sums_revenue(tmp_path, monkeypatch):
    raw = Path("tests/fixtures/tc01_kleinunternehmer_under.csv").read_bytes()
    df = parse_datev(raw, "tc01.csv")
    monkeypatch.chdir(tmp_path)
    write_ledger_json(df, ".")
    res = json.loads(ledger_compute.invoke({
        "code": "rev = df[df.account.str.startswith('84')].amount.sum(); result = float(rev)",
        "ledger_path": "/ledger.json",
    }))
    assert res["ok"] is True
    assert res["result"] == 3570.0
