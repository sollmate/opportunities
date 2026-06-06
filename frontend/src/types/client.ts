// Mirrors backend/app/schemas/client.py — keep in sync.
//
// Client master data: a Client with nested contacts and addresses. Read models
// carry server-generated ids; the *Input / Upsert shapes are write payloads
// (no ids — children are replaced wholesale on update).

import type { SelectOption } from "@/components/ui/form";
import type { TableStatusTone } from "@/components/ui/table";

export type ClientType = "company" | "individual";
export type ClientStatus = "prospect" | "active" | "inactive" | "archived";
export type AddressType = "registered" | "billing" | "mailing" | "other";

export interface ContactInput {
  salutation?: string | null;
  academic_title?: string | null;
  first_name: string;
  last_name: string;
  job_position?: string | null;
  is_primary: boolean;
}

export interface Contact extends ContactInput {
  contact_id: string;
}

export interface AddressInput {
  address_type: AddressType;
  line1?: string | null;
  line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  is_primary: boolean;
}

export interface Address extends AddressInput {
  address_id: string;
}

export interface ClientBase {
  client_number?: string | null;
  client_type: ClientType;
  display_name: string;
  legal_name?: string | null;
  legal_form?: string | null;
  status: ClientStatus;
  industry_id?: number | null;
  tax_number?: string | null;
  vat_id?: string | null;
  tax_office?: string | null;
  register_court?: string | null;
  register_number?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  founded_on?: string | null;
}

export interface ClientUpsert extends ClientBase {
  contacts: ContactInput[];
  addresses: AddressInput[];
}

export interface Client extends ClientBase {
  client_id: string;
  contacts: Contact[];
  addresses: Address[];
}

export interface ClientListResponse {
  clients: Client[];
}

export interface Industry {
  industry_id: number;
  code?: string | null;
  name: string;
}

export interface IndustryListResponse {
  industries: Industry[];
}

export const CLIENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual" },
];

export const CLIENT_STATUS_OPTIONS: SelectOption[] = [
  { value: "prospect", label: "Prospect", dot: "#F0D89A" },
  { value: "active", label: "Active", dot: "#84CFC0" },
  { value: "inactive", label: "Inactive", dot: "#7A7E84" },
  { value: "archived", label: "Archived", dot: "#7A7E84" },
];

export const ADDRESS_TYPE_OPTIONS: SelectOption[] = [
  { value: "registered", label: "Registered" },
  { value: "billing", label: "Billing" },
  { value: "mailing", label: "Mailing" },
  { value: "other", label: "Other" },
];

/** Map a client status to a shared StatusBadge tone for the list view. */
export function statusTone(status: ClientStatus): TableStatusTone {
  switch (status) {
    case "active":
      return "paid";
    case "prospect":
      return "pending";
    default:
      return "draft";
  }
}
