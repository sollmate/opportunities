"""Client master-data schemas — mirrors db/opportunities_poc.sql (crm/ref).

A `Client` is the central master-data record, with nested `contacts` and
`addresses`. Read models carry the server-generated ids; the `*Input` / `Upsert`
models are the write payloads (no ids — children are replaced wholesale on
update).
"""

from datetime import date
from typing import Literal

from pydantic import BaseModel

ClientType = Literal["company", "individual"]
ClientStatus = Literal["prospect", "active", "inactive", "archived"]
AddressType = Literal["registered", "billing", "mailing", "other"]


# ---------- contacts ----------
class ContactInput(BaseModel):
    salutation: str | None = None
    academic_title: str | None = None
    first_name: str
    last_name: str
    job_position: str | None = None
    is_primary: bool = False


class Contact(ContactInput):
    contact_id: str


# ---------- addresses ----------
class AddressInput(BaseModel):
    address_type: AddressType = "registered"
    line1: str | None = None
    line2: str | None = None
    postal_code: str | None = None
    city: str | None = None
    region: str | None = None
    country_code: str | None = None
    is_primary: bool = False


class Address(AddressInput):
    address_id: str


# ---------- client ----------
class ClientBase(BaseModel):
    client_number: str | None = None
    client_type: ClientType
    display_name: str
    legal_name: str | None = None
    legal_form: str | None = None
    status: ClientStatus = "prospect"
    industry_id: int | None = None
    tax_number: str | None = None
    vat_id: str | None = None
    tax_office: str | None = None
    register_court: str | None = None
    register_number: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    founded_on: date | None = None


class ClientUpsert(ClientBase):
    """Write payload for create/update — children are replaced wholesale."""

    contacts: list[ContactInput] = []
    addresses: list[AddressInput] = []


class Client(ClientBase):
    """Full client record as returned to the UI."""

    client_id: str
    contacts: list[Contact] = []
    addresses: list[Address] = []


class ClientListResponse(BaseModel):
    clients: list[Client]


# ---------- reference / lookup ----------
class Industry(BaseModel):
    industry_id: int
    code: str | None = None
    name: str


class IndustryListResponse(BaseModel):
    industries: list[Industry]
