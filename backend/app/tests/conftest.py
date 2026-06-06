from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Client with no authentication override — used for unauthenticated cases."""
    return TestClient(app)


@pytest.fixture
def authed_client() -> Iterator[TestClient]:
    """Client that bypasses Entra token validation with a stub authorized user.

    Real Entra access tokens can't be minted in unit tests, so the auth
    dependency is overridden to return a fixed user identity.
    """
    app.dependency_overrides[get_current_user] = lambda: "test-user"
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
