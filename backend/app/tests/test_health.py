"""Health and readiness endpoint tests."""

import pytest
from fastapi.testclient import TestClient

from app.core import db


def test_health_is_liveness_only(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ready_ok_when_db_unconfigured(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(db, "is_configured", lambda: False)
    resp = client.get("/api/ready")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "unconfigured"}


def test_ready_up_when_db_healthy(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(db, "is_configured", lambda: True)

    async def fake_healthcheck() -> bool:
        return True

    monkeypatch.setattr(db, "healthcheck", fake_healthcheck)
    resp = client.get("/api/ready")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "up"}


def test_ready_503_when_db_down(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(db, "is_configured", lambda: True)

    async def fake_healthcheck() -> bool:
        raise RuntimeError("connection refused")

    monkeypatch.setattr(db, "healthcheck", fake_healthcheck)
    resp = client.get("/api/ready")
    assert resp.status_code == 503
    assert resp.json() == {"status": "unavailable", "database": "down"}
