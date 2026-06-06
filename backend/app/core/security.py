from app.core.config import settings


def verify_token(token: str) -> bool:
    """Validate a bearer token.

    This is a stub: it compares against a single configured dev token. Replace
    with real verification (JWT signature, session lookup, etc.) when wiring up
    authentication.
    """
    return bool(token) and token == settings.dev_auth_token


def issue_token() -> str:
    """Issue a token for a (stubbed) successful login."""
    return settings.dev_auth_token
