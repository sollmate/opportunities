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


def is_configured() -> bool:
    """True when enough PG settings are present to attempt a connection."""
    return bool(settings.pg_host and settings.pg_database and settings.pg_user)


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


async def connect() -> None:
    """Create the global connection pool. No-op if already created or unconfigured.

    If the database is configured but unreachable (auth/network/Postgres
    outage), this logs and returns WITHOUT raising, so the API still starts and
    ``/api/ready`` reports the outage (503) rather than the process failing to
    boot. ``healthcheck()`` retries the connection later, so the app recovers on
    its own once the database is reachable again.
    """
    global _pool, _credential
    if _pool is not None or not is_configured():
        return

    if _credential is None:
        _credential = DefaultAzureCredential()
    try:
        _pool = await asyncpg.create_pool(
            host=settings.pg_host,
            port=settings.pg_port,
            database=settings.pg_database,
            user=settings.pg_user,
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
    global _pool, _credential
    if _pool is not None:
        await _pool.close()
        _pool = None
    if _credential is not None:
        await _credential.close()
        _credential = None


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
