"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  Field,
  FieldRow,
  FormBody,
  FormCard,
  FormFooter,
  FormGroupSection,
  FormHeader,
  FormSection,
  FormSuccess,
  Input,
  Select,
  StatusPill,
  SubmittingRow,
  ToggleRow,
  WizardSteps,
  useWizard,
  type SelectOption,
} from "@/components/ui/form";

const ENTITIES: SelectOption[] = [
  { value: "DAI-DE", label: "DAI-DE", dot: "#C8B8F0", code: "DAI-DE", secondary: "Daidalus GmbH · EUR" },
  { value: "DAI-US", label: "DAI-US", dot: "#84CFC0", code: "DAI-US", secondary: "Daidalus Inc. · USD" },
  { value: "DAI-NL", label: "DAI-NL", dot: "#6BA8A0", code: "DAI-NL", secondary: "Daidalus B.V. · EUR" },
  { value: "DAI-AT", label: "DAI-AT", dot: "#84CFC0", code: "DAI-AT", secondary: "Daidalus GmbH AT · EUR" },
];

const DE_ACCOUNTS: SelectOption[] = [
  { value: "1591", label: "1591", code: "1591", secondary: "· Receivable IC" },
  { value: "1601", label: "1601", code: "1601", secondary: "· Receivable IC alt" },
];

const US_ACCOUNTS: SelectOption[] = [
  { value: "1392", label: "1392", code: "1392", secondary: "· Payable IC" },
];

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
      {children}
    </p>
  );
}

/* ── 1 · Single column ─────────────────────────────────────────── */
function SingleColumn() {
  const [lender, setLender] = useState<string | null>("DAI-DE");
  const [borrower, setBorrower] = useState<string | null>("DAI-US");
  const [deAcct, setDeAcct] = useState<string | null>("1591");
  const [usAcct, setUsAcct] = useState<string | null>("1392");
  const [threshold, setThreshold] = useState("100.00");
  const [done, setDone] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(true);
  }

  if (done) {
    return (
      <FormSuccess
        title="Pair configured"
        subtitle="DAI-DE ↔ DAI-US is live and will reconcile at the next nightly close (22:00 CEST)."
        summary={[
          { label: "Lender", value: "DAI-DE · Daidalus GmbH" },
          { label: "Borrower", value: "DAI-US · Daidalus Inc." },
          { label: "Accounts", value: <span className="font-mono">{deAcct} ↔ {usAcct}</span> },
          { label: "Threshold", value: <span className="font-mono tabular-nums">€{threshold}</span> },
        ]}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDone(false)}>View pair</Button>
            <Button onClick={() => setDone(false)}>Add another</Button>
          </>
        }
      />
    );
  }

  return (
    <FormCard onSubmit={onSubmit}>
      <FormHeader
        title="New intercompany pair"
        subtitle="Define the lender → borrower relationship and reconciliation rules."
        status={<StatusPill tone="draft">Draft</StatusPill>}
      />
      <FormBody>
        <FormSection title="Entities">
          <Field label="Lender entity" required>
            <Select value={lender} onChange={setLender} options={ENTITIES} />
          </Field>
          <Field label="Borrower entity" required hint="FX revaluation runs nightly against ECB rates.">
            <Select value={borrower} onChange={setBorrower} options={ENTITIES} />
          </Field>
        </FormSection>
        <FormSection title="IC accounts">
          <FieldRow>
            <Field label="DAI-DE account">
              <Select value={deAcct} onChange={setDeAcct} options={DE_ACCOUNTS} />
            </Field>
            <Field label="DAI-US account">
              <Select value={usAcct} onChange={setUsAcct} options={US_ACCOUNTS} />
            </Field>
          </FieldRow>
        </FormSection>
        <FormSection title="Reconciliation rules">
          <Field label="Balanced threshold" hint="Pairs within ±€100 are auto-marked balanced.">
            <Input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              leftAdornment="€"
              rightAdornment="EUR"
              inputMode="decimal"
            />
          </Field>
        </FormSection>
      </FormBody>
      <FormFooter helper="Saved 12s ago">
        <Button type="button" variant="ghost">Cancel</Button>
        <Button type="submit">Save pair</Button>
      </FormFooter>
    </FormCard>
  );
}

/* ── Submitting state (shared across all patterns) ─────────────── */
function Submitting() {
  return (
    <FormCard submitting>
      <FormHeader
        title="New intercompany pair"
        subtitle="Validating mappings against DATEV…"
        status={<StatusPill tone="saving">Saving</StatusPill>}
      />
      <FormBody submitting>
        <FormSection title="Entities">
          <FieldRow>
            <Field label="Lender">
              <Select value="DAI-DE" onChange={() => {}} options={ENTITIES} />
            </Field>
            <Field label="Borrower">
              <Select value="DAI-AT" onChange={() => {}} options={ENTITIES} />
            </Field>
          </FieldRow>
        </FormSection>
        <SubmittingRow>
          <Spinner size={13} />
          Reaching DATEV · 1.4s
        </SubmittingRow>
      </FormBody>
      <FormFooter helper="Don't close this tab">
        <Button type="button" variant="ghost" disabled>Cancel</Button>
        <Button type="button" loading>Saving…</Button>
      </FormFooter>
    </FormCard>
  );
}

/* ── 2 · Grouped column (settings) ─────────────────────────────── */
function GroupedColumn() {
  const [autoNet, setAutoNet] = useState(true);
  const [notifyDrift, setNotifyDrift] = useState(true);
  const [lender, setLender] = useState<string | null>("DAI-DE");
  const [borrower, setBorrower] = useState<string | null>("DAI-NL");

  return (
    <FormCard>
      <FormHeader
        title="Pair configuration · DAI-DE ↔ DAI-NL"
        subtitle="Changes apply from the next posting date forward."
        status={<StatusPill tone="active">Active</StatusPill>}
      />
      <FormBody>
        <FormGroupSection
          title="Entities"
          description="Direction defaults to lender → borrower; can be reversed per posting."
        >
          <FieldRow>
            <Field label="Lender">
              <Select value={lender} onChange={setLender} options={ENTITIES} />
            </Field>
            <Field label="Borrower">
              <Select value={borrower} onChange={setBorrower} options={ENTITIES} />
            </Field>
          </FieldRow>
        </FormGroupSection>
        <FormGroupSection
          title="Automation"
          description="SollMate can auto-net opposite postings and flag drift over your threshold."
        >
          <ToggleRow
            title="Auto-net opposite postings"
            description="Net counter-postings within the same fiscal period."
            checked={autoNet}
            onChange={setAutoNet}
          />
          <ToggleRow
            title="Notify on drift > €5,000"
            description="Alerts the pair owner via the Channels tab."
            checked={notifyDrift}
            onChange={setNotifyDrift}
          />
        </FormGroupSection>
      </FormBody>
      <FormFooter helper="All fields validated">
        <Button variant="ghost">Save draft</Button>
        <Button>Save &amp; activate</Button>
      </FormFooter>
    </FormCard>
  );
}

/* ── 3 · Wizard ────────────────────────────────────────────────── */
const STEPS = [
  { label: "Entities" },
  { label: "Accounts" },
  { label: "Rules" },
  { label: "Review" },
];

function Wizard() {
  const wiz = useWizard(STEPS.length, 1);
  const [deAcct, setDeAcct] = useState<string | null>("1591");
  const [chAcct, setChAcct] = useState<string | null>(null);
  const [mirror, setMirror] = useState(true);

  return (
    <FormCard>
      <WizardSteps steps={STEPS} current={wiz.step} onStepClick={wiz.goTo} />
      <FormHeader
        title="Map IC accounts"
        subtitle="Pick the receivable account on the lender and the matching payable on the borrower."
      />
      <FormBody>
        <Field label="DAI-DE · Lender account" required hint="SKR03 mapping recognised.">
          <Select value={deAcct} onChange={setDeAcct} options={DE_ACCOUNTS} />
        </Field>
        <Field
          label="DAI-CH · Borrower account"
          required
          error={chAcct ? undefined : "No matching mapping found in the borrower's chart."}
        >
          <Select
            value={chAcct}
            onChange={setChAcct}
            options={US_ACCOUNTS}
            placeholder="Pick a payable account…"
          />
        </Field>
        <ToggleRow
          title="Mirror direction for reverse postings"
          description="Use the same accounts when DAI-CH lends back to DAI-DE."
          checked={mirror}
          onChange={setMirror}
        />
      </FormBody>
      <FormFooter
        left={
          <Button variant="text" onClick={wiz.back} disabled={wiz.isFirst}>
            ← Back
          </Button>
        }
      >
        <Button variant="ghost">Save &amp; close</Button>
        <Button onClick={wiz.next} disabled={wiz.isLast}>Continue →</Button>
      </FormFooter>
    </FormCard>
  );
}

export default function FormsPreviewPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-text">Form components</h1>

      <section>
        <Caption>1 · Single column</Caption>
        <SingleColumn />
      </section>

      <section>
        <Caption>State · submitting</Caption>
        <Submitting />
      </section>

      <section>
        <Caption>2 · Grouped column (settings)</Caption>
        <GroupedColumn />
      </section>

      <section>
        <Caption>3 · Wizard</Caption>
        <Wizard />
      </section>
    </main>
  );
}
