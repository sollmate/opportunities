"""Postgres-backed persistence for client master data (crm + ref schemas).

Unlike chat threads, client master data is **org-wide** — it is not scoped per
user. All queries go through the managed-identity connection pool in
``app.core.db``. The schema is defined in ``db/opportunities_poc.sql``.

Child rows (contacts, addresses) are loaded alongside their client and, on
update, replaced wholesale rather than diffed — the simplest correct approach
for this POC.
"""

from __future__ import annotations

from app.core import db
from app.schemas.client import (
    Address,
    Client,
    ClientUpsert,
    Contact,
    Industry,
)

# Scalar client columns, in a single place so insert/update stay in sync.
_CLIENT_FIELDS = (
    "client_number",
    "client_type",
    "display_name",
    "legal_name",
    "legal_form",
    "status",
    "industry_id",
    "tax_number",
    "vat_id",
    "tax_office",
    "register_court",
    "register_number",
    "phone",
    "email",
    "website",
    "founded_on",
)


def _to_contact(row) -> Contact:
    return Contact(
        contact_id=str(row["contact_id"]),
        salutation=row["salutation"],
        academic_title=row["academic_title"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        job_position=row["job_position"],
        is_primary=row["is_primary"],
    )


def _to_address(row) -> Address:
    return Address(
        address_id=str(row["address_id"]),
        address_type=row["address_type"],
        line1=row["line1"],
        line2=row["line2"],
        postal_code=row["postal_code"],
        city=row["city"],
        region=row["region"],
        country_code=row["country_code"],
        is_primary=row["is_primary"],
    )


def _to_client(
    row,
    contacts: list[Contact] | None = None,
    addresses: list[Address] | None = None,
) -> Client:
    return Client(
        client_id=str(row["client_id"]),
        client_number=row["client_number"],
        client_type=row["client_type"],
        display_name=row["display_name"],
        legal_name=row["legal_name"],
        legal_form=row["legal_form"],
        status=row["status"],
        industry_id=row["industry_id"],
        tax_number=row["tax_number"],
        vat_id=row["vat_id"],
        tax_office=row["tax_office"],
        register_court=row["register_court"],
        register_number=row["register_number"],
        phone=row["phone"],
        email=row["email"],
        website=row["website"],
        founded_on=row["founded_on"],
        contacts=contacts or [],
        addresses=addresses or [],
    )


_CLIENT_SELECT = f"SELECT client_id, {', '.join(_CLIENT_FIELDS)} FROM crm.client"


async def list_clients() -> list[Client]:
    """Return every client with its nested contacts and addresses.

    Three queries (clients, all contacts, all addresses) assembled in Python to
    avoid an N+1 fan-out per client.
    """
    pool = db.get_pool()
    async with pool.acquire() as conn:
        client_rows = await conn.fetch(
            _CLIENT_SELECT + " ORDER BY lower(display_name)"
        )
        contact_rows = await conn.fetch("SELECT * FROM crm.contact")
        address_rows = await conn.fetch("SELECT * FROM crm.address")

    contacts: dict[str, list[Contact]] = {}
    for r in contact_rows:
        contacts.setdefault(str(r["client_id"]), []).append(_to_contact(r))
    addresses: dict[str, list[Address]] = {}
    for r in address_rows:
        addresses.setdefault(str(r["client_id"]), []).append(_to_address(r))

    return [
        _to_client(
            r,
            contacts.get(str(r["client_id"])),
            addresses.get(str(r["client_id"])),
        )
        for r in client_rows
    ]


async def get_client(client_id: str) -> Client | None:
    pool = db.get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            _CLIENT_SELECT + " WHERE client_id = $1", client_id
        )
        if row is None:
            return None
        contact_rows = await conn.fetch(
            "SELECT * FROM crm.contact WHERE client_id = $1", client_id
        )
        address_rows = await conn.fetch(
            "SELECT * FROM crm.address WHERE client_id = $1", client_id
        )
    return _to_client(
        row,
        [_to_contact(r) for r in contact_rows],
        [_to_address(r) for r in address_rows],
    )


async def _insert_children(conn, client_id: str, payload: ClientUpsert) -> None:
    for c in payload.contacts:
        await conn.execute(
            """
            INSERT INTO crm.contact
                (client_id, salutation, academic_title, first_name,
                 last_name, job_position, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            client_id,
            c.salutation,
            c.academic_title,
            c.first_name,
            c.last_name,
            c.job_position,
            c.is_primary,
        )
    for a in payload.addresses:
        await conn.execute(
            """
            INSERT INTO crm.address
                (client_id, address_type, line1, line2, postal_code,
                 city, region, country_code, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            client_id,
            a.address_type,
            a.line1,
            a.line2,
            a.postal_code,
            a.city,
            a.region,
            a.country_code,
            a.is_primary,
        )


async def create_client(payload: ClientUpsert) -> Client:
    pool = db.get_pool()
    cols = ", ".join(_CLIENT_FIELDS)
    placeholders = ", ".join(f"${i}" for i in range(1, len(_CLIENT_FIELDS) + 1))
    values = [getattr(payload, f) for f in _CLIENT_FIELDS]
    async with pool.acquire() as conn:
        async with conn.transaction():
            client_id = await conn.fetchval(
                f"INSERT INTO crm.client ({cols}) VALUES ({placeholders}) "
                "RETURNING client_id",
                *values,
            )
            await _insert_children(conn, client_id, payload)
    created = await get_client(str(client_id))
    assert created is not None  # just inserted
    return created


async def update_client(client_id: str, payload: ClientUpsert) -> Client | None:
    """Update scalar fields and replace child rows. None if the id is unknown."""
    pool = db.get_pool()
    assignments = ", ".join(f"{f} = ${i}" for i, f in enumerate(_CLIENT_FIELDS, start=2))
    values = [getattr(payload, f) for f in _CLIENT_FIELDS]
    async with pool.acquire() as conn:
        async with conn.transaction():
            updated = await conn.fetchval(
                f"UPDATE crm.client SET {assignments} WHERE client_id = $1 "
                "RETURNING client_id",
                client_id,
                *values,
            )
            if updated is None:
                return None
            await conn.execute(
                "DELETE FROM crm.contact WHERE client_id = $1", client_id
            )
            await conn.execute(
                "DELETE FROM crm.address WHERE client_id = $1", client_id
            )
            await _insert_children(conn, client_id, payload)
    return await get_client(client_id)


async def delete_client(client_id: str) -> bool:
    """Delete a client (FK cascade removes contacts/addresses). True if removed."""
    pool = db.get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM crm.client WHERE client_id = $1", client_id
        )
    # asyncpg returns a status string like "DELETE 1".
    return result.rsplit(" ", 1)[-1] != "0"


async def list_industries() -> list[Industry]:
    pool = db.get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT industry_id, code, name FROM ref.industry ORDER BY name"
        )
    return [
        Industry(industry_id=r["industry_id"], code=r["code"], name=r["name"])
        for r in rows
    ]
