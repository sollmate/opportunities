"""PostgreSQL connection pool using Microsoft Entra (managed identity) auth.

No database password is stored anywhere. At connection time we acquire a
short-lived Microsoft Entra access token via ``DefaultAzureCredential`` and
present it as the password. In Azure this resolves to the container app's
managed identity; locally it falls back to your ``az login`` identity — the
same code path in both places.

The pool is optional: if the PG settings are not configured the module is a
no-op, so the API still boots without database access (persistence is still
stubbed elsewhere).
"""

from __future__ import annotations

import base64
import json
import logging
import ssl

import asyncpg
from azure.identity.aio import DefaultAzureCredential

from app.core.config import settings

logger = logging.getLogger(__name__)

# Scope for Azure Database for PostgreSQL Entra tokens. Must be exactly this.
_PG_TOKEN_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"

_pool: asyncpg.Pool | None = None
_credential: DefaultAzureCredential | None = None
_resolved_user: str | None = None


def is_configured() -> bool:
    """True when enough PG settings are present to attempt a connection.

    ``pg_user`` is optional: when omitted we derive it from the Entra token
    (see ``_resolve_user``), which means a local ``az login`` is enough to
    connect without putting your UPN in ``.env``.
    """
    return bool(settings.pg_host and settings.pg_database)


def _build_ssl_context() -> ssl.SSLContext:
    """Verified TLS context for the Postgres connection.

    Unlike asyncpg's ``ssl="require"`` (which encrypts but falls back to no
    certificate verification when no root cert is present), this validates the
    server certificate chain AND hostname against the system trust store — Azure
    Postgres certs chain to public CAs already in that store. Set
    ``PG_SSL_ROOT_CERT`` to pin an explicit CA bundle instead.
    """
    ctx = ssl.create_default_context(cafile=settings.pg_ssl_root_cert or None)
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED
    return ctx


async def _fetch_token() -> str:
    """Return a fresh Entra access token for Postgres.

    Passed as the asyncpg ``password`` callable, so each new physical
    connection authenticates with a current token. ``azure-identity`` caches
    the token internally and only round-trips to Entra near expiry, so this is
    cheap to call per connection.
    """
    assert _credential is not None  # connect() sets this before the pool exists
    token = await _credential.get_token(_PG_TOKEN_SCOPE)
    return token.token


def _principal_from_token(token: str) -> str | None:
    """Best-effort extraction of the database role name from an Entra token.

    For user tokens (local ``az login``) the ``upn`` claim holds the UPN, which
    is exactly the name Azure Postgres uses for the Entra principal. For
    managed-identity tokens the ``upn`` claim is absent; the caller should
    supply ``PG_USER`` explicitly in that environment.
    """
    try:
        payload_b64 = token.split(".")[1]
        # JWT base64url, pad to a multiple of 4.
        payload_b64 += "=" * (-len(payload_b64) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        return None
    for key in ("upn", "preferred_username", "unique_name"):
        value = claims.get(key)
        if isinstance(value, str) and value:
            return value
    return None


async def _resolve_user() -> str | None:
    """Return the database role name to connect as.

    ``PG_USER`` wins when set (required in Azure, where it's the managed
    identity's name). Otherwise we derive it from the Entra access token's
    ``upn`` claim, which means a developer with ``az login`` doesn't need to
    put their UPN in ``.env``.
    """
    if settings.pg_user:
        return settings.pg_user
    assert _credential is not None
    token = (await _credential.get_token(_PG_TOKEN_SCOPE)).token
    user = _principal_from_token(token)
    if user:
        logger.info("PG_USER not set; resolved %s from Entra token.", user)
    return user


async def connect() -> None:
    """Create the global connection pool. No-op if already created or unconfigured.

    If the database is configured but unreachable (auth/network/Postgres
    outage), this logs and returns WITHOUT raising, so the API still starts and
    ``/api/ready`` reports the outage (503) rather than the process failing to
    boot. ``healthcheck()`` retries the connection later, so the app recovers on
    its own once the database is reachable again.
    """
    global _pool, _credential, _resolved_user
    if _pool is not None or not is_configured():
        return

    if _credential is None:
        # Pass the managed identity's client id explicitly. We cannot rely on
        # the default `AZURE_CLIENT_ID` env var here: that var is set to the
        # Entra JWT app registration's client id (see config), so letting
        # DefaultAzureCredential read it would make it request a token for a
        # managed identity that doesn't exist. An empty value falls back to the
        # system-assigned identity / local `az login` identity.
        _credential = DefaultAzureCredential(
            managed_identity_client_id=settings.pg_mi_client_id or None
        )

    user = settings.pg_user
    try:
        if not user:
            user = await _resolve_user()
        if not user:
            logger.error(
                "Cannot determine PG user: PG_USER is unset and the Entra "
                "token has no upn/preferred_username claim (this is normal "
                "for managed identity tokens — set PG_USER explicitly in "
                "that case)."
            )
            return
        _resolved_user = user
        _pool = await asyncpg.create_pool(
            host=settings.pg_host,
            port=settings.pg_port,
            database=settings.pg_database,
            user=user,
            password=_fetch_token,
            ssl=_build_ssl_context(),
            min_size=1,
            max_size=settings.pg_pool_max_size,
            command_timeout=settings.pg_command_timeout,
        )
    except Exception:
        logger.exception(
            "Postgres pool initialization failed; starting without a database "
            "connection. /api/ready will report 503 and the pool will be "
            "retried on the next readiness check."
        )
        _pool = None


async def disconnect() -> None:
    """Close the pool and credential. Safe to call when nothing was opened."""
    global _pool, _credential, _resolved_user
    if _pool is not None:
        await _pool.close()
        _pool = None
    if _credential is not None:
        await _credential.close()
        _credential = None
    _resolved_user = None


def get_pool() -> asyncpg.Pool:
    """Return the live pool, or raise if the DB layer is not initialized."""
    if _pool is None:
        raise RuntimeError("Database pool is not initialized — check PG_* settings and startup.")
    return _pool


async def healthcheck() -> bool:
    """Return True if a trivial query succeeds over the pool.

    If a previous startup attempt left the pool uninitialized (DB was down),
    this retries ``connect()`` first, so the app recovers without a restart once
    the database becomes reachable.
    """
    if _pool is None and is_configured():
        await connect()
    if _pool is None:
        return False
    async with _pool.acquire() as conn:
        return await conn.fetchval("SELECT 1") == 1
