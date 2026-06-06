import pytest
from httpx import ASGITransport, AsyncClient

from src.api.deps import get_current_user
from src.api.main import app


@pytest.fixture
async def client():
    # Real Entra access tokens can't be minted in unit tests, so the auth
    # dependency is overridden to return a fixed user identity. Tests that
    # need to exercise the unauthenticated path should use `unauth_client`.
    app.dependency_overrides[get_current_user] = lambda: "test-user"
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def unauth_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
