"""Startup/lifespan tests.

The app must boot (and serve /api/health) regardless of whether Entra ID is
configured. The Entra OpenID/JWKS warm-up should run only when both the tenant
and client IDs are set, and must never be the reason the API fails to start.
"""

import pytest
from fastapi.testclient import TestClient

from app.core import security
from app.core.config import settings
from app.main import app


def test_app_starts_and_skips_warmup_when_unconfigured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = False

    async def fake_load_config() -> None:
        nonlocal called
        called = True

    monkeypatch.setattr(settings, "azure_tenant_id", "")
    monkeypatch.setattr(settings, "azure_client_id", "")
    monkeypatch.setattr(
        security.azure_scheme.openid_config, "load_config", fake_load_config
    )

    # Entering the context manager runs the lifespan startup.
    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200

    assert called is False


def test_app_warms_entra_cache_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = False

    async def fake_load_config() -> None:
        nonlocal called
        called = True

    monkeypatch.setattr(settings, "azure_tenant_id", "test-tenant")
    monkeypatch.setattr(settings, "azure_client_id", "test-client")
    monkeypatch.setattr(
        security.azure_scheme.openid_config, "load_config", fake_load_config
    )

    with TestClient(app) as client:
        assert client.get("/api/health").status_code == 200

    assert called is True
