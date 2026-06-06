"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { DeleteConfirm, DeleteSimple } from "@/components/ui/DeleteButton";
import {
  Field,
  FieldRow,
  FormBody,
  FormCard,
  FormFooter,
  FormHeader,
  FormSection,
  Input,
  Select,
  StatusPill,
  ToggleRow,
  type SelectOption,
} from "@/components/ui/form";
import { createClient, deleteClient, updateClient } from "@/lib/clients";
import {
  ADDRESS_TYPE_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  CLIENT_TYPE_OPTIONS,
  type AddressInput,
  type Client,
  type ClientStatus,
  type ClientType,
  type ClientUpsert,
  type ContactInput,
} from "@/types/client";

interface ClientEditorProps {
  /** The client being edited, or null to create a new one. */
  client: Client | null;
  industries: SelectOption[];
  onSaved: () => void;
  onDeleted: () => void;
  onCancel: () => void;
}

interface EditForm {
  client_number: string;
  client_type: ClientType;
  display_name: string;
  legal_name: string;
  legal_form: string;
  status: ClientStatus;
  industry_id: string;
  tax_number: string;
  vat_id: string;
  tax_office: string;
  register_court: string;
  register_number: string;
  phone: string;
  email: string;
  website: string;
  founded_on: string;
  contacts: ContactInput[];
  addresses: AddressInput[];
}

const s = (v: string | null | undefined) => v ?? "";
const nullify = (v: string) => (v.trim() === "" ? null : v.trim());

function toForm(client: Client | null): EditForm {
  return {
    client_number: s(client?.client_number),
    client_type: client?.client_type ?? "company",
    display_name: s(client?.display_name),
    legal_name: s(client?.legal_name),
    legal_form: s(client?.legal_form),
    status: client?.status ?? "prospect",
    industry_id: client?.industry_id != null ? String(client.industry_id) : "",
    tax_number: s(client?.tax_number),
    vat_id: s(client?.vat_id),
    tax_office: s(client?.tax_office),
    register_court: s(client?.register_court),
    register_number: s(client?.register_number),
    phone: s(client?.phone),
    email: s(client?.email),
    website: s(client?.website),
    founded_on: s(client?.founded_on),
    contacts: client?.contacts.map(stripContact) ?? [],
    addresses: client?.addresses.map(stripAddress) ?? [],
  };
}

function stripContact(c: ContactInput): ContactInput {
  return {
    salutation: c.salutation ?? null,
    academic_title: c.academic_title ?? null,
    first_name: c.first_name,
    last_name: c.last_name,
    job_position: c.job_position ?? null,
    is_primary: c.is_primary,
  };
}

function stripAddress(a: AddressInput): AddressInput {
  return {
    address_type: a.address_type,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    postal_code: a.postal_code ?? null,
    city: a.city ?? null,
    region: a.region ?? null,
    country_code: a.country_code ?? null,
    is_primary: a.is_primary,
  };
}

function toPayload(form: EditForm): ClientUpsert {
  return {
    client_number: nullify(form.client_number),
    client_type: form.client_type,
    display_name: form.display_name.trim(),
    legal_name: nullify(form.legal_name),
    legal_form: nullify(form.legal_form),
    status: form.status,
    industry_id: form.industry_id ? Number(form.industry_id) : null,
    tax_number: nullify(form.tax_number),
    vat_id: nullify(form.vat_id),
    tax_office: nullify(form.tax_office),
    register_court: nullify(form.register_court),
    register_number: nullify(form.register_number),
    phone: nullify(form.phone),
    email: nullify(form.email),
    website: nullify(form.website),
    founded_on: nullify(form.founded_on),
    contacts: form.contacts.map((c) => ({
      ...c,
      first_name: c.first_name.trim(),
      last_name: c.last_name.trim(),
    })),
    addresses: form.addresses,
  };
}

const EMPTY_CONTACT: ContactInput = {
  first_name: "",
  last_name: "",
  job_position: null,
  is_primary: false,
};

const EMPTY_ADDRESS: AddressInput = {
  address_type: "registered",
  is_primary: false,
};

export function ClientEditor({
  client,
  industries,
  onSaved,
  onDeleted,
  onCancel,
}: ClientEditorProps) {
  const isNew = client === null;
  const [form, setForm] = useState<EditForm>(() => toForm(client));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const nameInvalid = submitted && form.display_name.trim() === "";
  const contactsInvalid = form.contacts.some(
    (c) => c.first_name.trim() === "" || c.last_name.trim() === "",
  );

  function set<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function patchContact(i: number, patch: Partial<ContactInput>) {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)),
    }));
  }

  function patchAddress(i: number, patch: Partial<AddressInput>) {
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.map((a, j) =>
        j === i ? { ...a, ...patch } : a,
      ),
    }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (form.display_name.trim() === "" || contactsInvalid) return;

    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (isNew) {
        await createClient(payload);
      } else {
        await updateClient(client.client_id, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (isNew) return;
    setSaving(true);
    setError(null);
    try {
      await deleteClient(client.client_id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
      setSaving(false);
    }
  }

  return (
    <FormCard onSubmit={onSubmit} submitting={saving} className="lg:h-full lg:min-h-0">
      <FormHeader
        className="shrink-0"
        title={form.display_name.trim() || (isNew ? "New client" : "Client")}
        subtitle={isNew ? "Create a new client record" : form.client_number || undefined}
        status={
          <StatusPill tone={form.status === "active" ? "active" : "draft"}>
            <span className="capitalize">{form.status}</span>
          </StatusPill>
        }
      />

      <FormBody submitting={saving} className="sm-scroll lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {error && <p className="text-[12px] text-danger">{error}</p>}

        <FormSection title="Identity">
          <FieldRow>
            <Field label="Client number">
              <Input
                value={form.client_number}
                onChange={(e) => set("client_number", e.target.value)}
                placeholder="Mandantennummer"
              />
            </Field>
            <Field label="Type" required>
              <Select
                value={form.client_type}
                onChange={(v) => set("client_type", v as ClientType)}
                options={CLIENT_TYPE_OPTIONS}
                aria-label="Client type"
              />
            </Field>
          </FieldRow>
          <Field
            label="Display name"
            required
            error={nameInvalid ? "Display name is required" : undefined}
          >
            <Input
              value={form.display_name}
              onChange={(e) => set("display_name", e.target.value)}
            />
          </Field>
          <FieldRow>
            <Field label="Legal name">
              <Input
                value={form.legal_name}
                onChange={(e) => set("legal_name", e.target.value)}
              />
            </Field>
            <Field label="Legal form">
              <Input
                value={form.legal_form}
                onChange={(e) => set("legal_form", e.target.value)}
                placeholder="GmbH, UG, …"
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Status" required>
              <Select
                value={form.status}
                onChange={(v) => set("status", v as ClientStatus)}
                options={CLIENT_STATUS_OPTIONS}
                aria-label="Status"
              />
            </Field>
            <Field label="Industry">
              <Select
                value={form.industry_id}
                onChange={(v) => set("industry_id", v)}
                options={industries}
                placeholder={industries.length ? "Select…" : "No industries"}
                aria-label="Industry"
              />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title="Tax & registration">
          <FieldRow>
            <Field label="Tax number">
              <Input
                value={form.tax_number}
                onChange={(e) => set("tax_number", e.target.value)}
              />
            </Field>
            <Field label="VAT ID">
              <Input
                value={form.vat_id}
                onChange={(e) => set("vat_id", e.target.value)}
                placeholder="USt-IdNr"
              />
            </Field>
          </FieldRow>
          <Field label="Tax office">
            <Input
              value={form.tax_office}
              onChange={(e) => set("tax_office", e.target.value)}
              placeholder="Finanzamt"
            />
          </Field>
          <FieldRow>
            <Field label="Register court">
              <Input
                value={form.register_court}
                onChange={(e) => set("register_court", e.target.value)}
              />
            </Field>
            <Field label="Register number">
              <Input
                value={form.register_number}
                onChange={(e) => set("register_number", e.target.value)}
                placeholder="HRB / HRA"
              />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title="Contact">
          <FieldRow>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
          </FieldRow>
          <Field label="Website">
            <Input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection title="Contacts">
          {form.contacts.map((c, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border border-charcoal bg-ink p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
                  Contact {i + 1}
                </span>
                <DeleteSimple
                  size="sm"
                  subject="contact"
                  onDelete={() =>
                    set(
                      "contacts",
                      form.contacts.filter((_, j) => j !== i),
                    )
                  }
                />
              </div>
              <FieldRow>
                <Field
                  label="First name"
                  required
                  error={
                    submitted && c.first_name.trim() === ""
                      ? "Required"
                      : undefined
                  }
                >
                  <Input
                    value={c.first_name}
                    onChange={(e) => patchContact(i, { first_name: e.target.value })}
                  />
                </Field>
                <Field
                  label="Last name"
                  required
                  error={
                    submitted && c.last_name.trim() === ""
                      ? "Required"
                      : undefined
                  }
                >
                  <Input
                    value={c.last_name}
                    onChange={(e) => patchContact(i, { last_name: e.target.value })}
                  />
                </Field>
              </FieldRow>
              <Field label="Position">
                <Input
                  value={s(c.job_position)}
                  onChange={(e) =>
                    patchContact(i, { job_position: e.target.value })
                  }
                />
              </Field>
              <ToggleRow
                title="Primary contact"
                checked={c.is_primary}
                onChange={(v) => patchContact(i, { is_primary: v })}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => set("contacts", [...form.contacts, { ...EMPTY_CONTACT }])}
          >
            + Add contact
          </Button>
        </FormSection>

        <FormSection title="Addresses">
          {form.addresses.map((a, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border border-charcoal bg-ink p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
                  Address {i + 1}
                </span>
                <DeleteSimple
                  size="sm"
                  subject="address"
                  onDelete={() =>
                    set(
                      "addresses",
                      form.addresses.filter((_, j) => j !== i),
                    )
                  }
                />
              </div>
              <Field label="Type">
                <Select
                  value={a.address_type}
                  onChange={(v) =>
                    patchAddress(i, { address_type: v as AddressInput["address_type"] })
                  }
                  options={ADDRESS_TYPE_OPTIONS}
                  aria-label="Address type"
                />
              </Field>
              <Field label="Line 1">
                <Input
                  value={s(a.line1)}
                  onChange={(e) => patchAddress(i, { line1: e.target.value })}
                />
              </Field>
              <Field label="Line 2">
                <Input
                  value={s(a.line2)}
                  onChange={(e) => patchAddress(i, { line2: e.target.value })}
                />
              </Field>
              <FieldRow>
                <Field label="Postal code">
                  <Input
                    value={s(a.postal_code)}
                    onChange={(e) =>
                      patchAddress(i, { postal_code: e.target.value })
                    }
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={s(a.city)}
                    onChange={(e) => patchAddress(i, { city: e.target.value })}
                  />
                </Field>
              </FieldRow>
              <FieldRow>
                <Field label="Region">
                  <Input
                    value={s(a.region)}
                    onChange={(e) => patchAddress(i, { region: e.target.value })}
                  />
                </Field>
                <Field label="Country">
                  <Input
                    value={s(a.country_code)}
                    onChange={(e) =>
                      patchAddress(i, { country_code: e.target.value })
                    }
                    placeholder="DE"
                  />
                </Field>
              </FieldRow>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => set("addresses", [...form.addresses, { ...EMPTY_ADDRESS }])}
          >
            + Add address
          </Button>
        </FormSection>
      </FormBody>

      <FormFooter
        className="shrink-0"
        left={
          isNew ? (
            <Button variant="text" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <DeleteConfirm subject="client" size="md" onDelete={onDelete} />
          )
        }
      >
        <Button type="submit" loading={saving} disabled={contactsInvalid}>
          {isNew ? "Create client" : "Save changes"}
        </Button>
      </FormFooter>
    </FormCard>
  );
}
