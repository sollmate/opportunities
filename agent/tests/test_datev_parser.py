from pathlib import Path

from src.parsers.datev_parser import detect_skr, parse_datev


def test_parse_extf_revenue_sign():
    raw = Path("tests/fixtures/tc01_kleinunternehmer_under.csv").read_bytes()
    df = parse_datev(raw, "tc01.csv")
    assert len(df) == 2
    assert detect_skr(df) == "SKR03"
    # credit (H) on revenue accounts => positive signed amount
    assert df["amount_signed"].sum() == 3570.0
