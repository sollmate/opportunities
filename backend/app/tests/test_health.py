"""Health and readiness endpoint tests."""

import pytest
from fastapi.testclient import TestClient

from app.core import db
from app.main import app


def test_health_is_liveness_only(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ready_ok_when_db_unconfigured(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(db, "is_configured", lambda: False)
    resp = client.get("/api/ready")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "unconfigured"}


def test_ready_up_when_db_healthy(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(db, "is_configured", lambda: True)

    async def fake_healthcheck() -> bool:
        return True

    monkeypatch.setattr(db, "healthcheck", fake_healthcheck)
    resp = client.get("/api/ready")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "database": "up"}


def test_ready_503_when_db_down(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(db, "is_configured", lambda: True)

    async def fake_healthcheck() -> bool:
        raise RuntimeError("connection refused")

    monkeypatch.setattr(db, "healthcheck", fake_healthcheck)
    resp = client.get("/api/ready")
    assert resp.status_code == 503
    assert resp.json() == {"status": "unavailable", "database": "down"}


def test_app_starts_when_db_unreachable_at_startup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A configured-but-unreachable DB must not fail startup; the app boots and
    /api/ready reports 503 (rather than the process crashing in the lifespan)."""

    class FakeCredential:
        async def close(self) -> None: ...

    async def boom(*args: object, **kwargs: object) -> object:
        raise OSError("connection refused")

    monkeypatch.setattr(db, "is_configured", lambda: True)
    monkeypatch.setattr(db, "DefaultAzureCredential", FakeCredential)
    monkeypatch.setattr(db.asyncpg, "create_pool", boom)
    monkeypatch.setattr(db, "_pool", None)
    monkeypatch.setattr(db, "_credential", None)

    # Entering the context manager runs lifespan startup — it must not raise.
    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200
        resp = client.get("/api/ready")
        assert resp.status_code == 503
        assert resp.json() == {"status": "unavailable", "database": "down"}
