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


@pytest.mark.asyncio
async def test_session_requires_auth(unauth_client):
    with open("tests/fixtures/tc01_kleinunternehmer_under.csv", "rb") as f:
        r = await unauth_client.post(
            "/tax-advisory/session",
            files={"datev_file": ("tc01.csv", f, "text/csv")},
        )
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_health_is_public(unauth_client):
    r = await unauth_client.get("/health")
    assert r.status_code == 200
