import pytest


@pytest.mark.asyncio
async def test_create_session_detects_skr(client):
    with open("tests/fixtures/tc01_kleinunternehmer_under.csv", "rb") as f:
        r = await client.post(
            "/tax-advisory/session",
            files={"datev_file": ("tc01.csv", f, "text/csv")},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["skr_variant"] == "SKR03"
    assert body["ledger_rows"] == 2
    assert "prior_year_net_turnover" in body["missing_fields"]


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
