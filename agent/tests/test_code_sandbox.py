import json
from pathlib import Path

from src.agent.tools.code_sandbox import ledger_compute


def _write_sample_csv(root: Path) -> None:
    uploads = root / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    (uploads / "bookings.csv").write_text(
        "account,amount\n8400,1190.0\n8400,2380.0\n1200,500.0\n",
        encoding="utf-8",
    )


def test_sandbox_blocks_import(tmp_path, monkeypatch):
    _write_sample_csv(tmp_path)
    monkeypatch.chdir(tmp_path)
    res = json.loads(ledger_compute.invoke(
        {"code": "import os\nresult = 1", "data_path": "/uploads/bookings.csv"}
    ))
    assert res["ok"] is False


def test_sandbox_sums_revenue(tmp_path, monkeypatch):
    _write_sample_csv(tmp_path)
    monkeypatch.chdir(tmp_path)
    res = json.loads(ledger_compute.invoke({
        "code": "rev = df[df.account.astype(str).str.startswith('84')].amount.sum(); result = float(rev)",
        "data_path": "/uploads/bookings.csv",
    }))
    assert res["ok"] is True
    assert res["result"] == 3570.0
