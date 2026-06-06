"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  Avatar,
  ChannelTag,
  EditableTable,
  GroupedTable,
  StatusBadge,
  useGroupedTable,
  type CellOption,
  type EditableColumn,
  type EditableRow,
  type GroupedColumn,
  type TableGroup,
  type TableStatusTone,
} from "@/components/ui/table";
import { TableCard, TableFooter, TableHeader, TableScroll } from "@/components/ui/table";

function Caption({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
      {children}
    </p>
  );
}

/* ═══════════════ 1 · Grouped (expandable) table ═══════════════ */

interface Customer {
  name: string;
  email: string;
  earliest: string;
  latest: string;
  count: number;
  amount: string;
  status: TableStatusTone;
  statusLabel: string;
  channel: { label: string; color: string };
}

interface Invoice {
  id: string;
  issued: string;
  due: string;
  amount: string;
  status: TableStatusTone;
  statusLabel: string;
  channel: { label: string; color: string };
}

const SLACK = { label: "Slack", color: "#C8B8F0" };
const EMAIL = { label: "Email", color: "#9B7FE0" };
const TEAMS = { label: "Teams", color: "#00BCD4" };
const NONE = { label: "—", color: "#7A7E84" };

const RECEIVABLES: TableGroup<Customer, Invoice>[] = [
  {
    id: "mueller",
    parent: {
      name: "Müller GmbH",
      email: "ar@mueller.de",
      earliest: "2026-05-02",
      latest: "2026-05-19",
      count: 2,
      amount: "€63,600.00",
      status: "mixed",
      statusLabel: "Mixed",
      channel: SLACK,
    },
    children: [
      { id: "INV-2026-0148", issued: "2026-04-02", due: "2026-05-02", amount: "€48,200.00", status: "overdue", statusLabel: "Overdue · 7d", channel: SLACK },
      { id: "INV-2026-0181", issued: "2026-04-19", due: "2026-05-19", amount: "€15,400.00", status: "pending", statusLabel: "Pending", channel: SLACK },
    ],
  },
  {
    id: "berliner",
    parent: {
      name: "Berliner Verlag KG",
      email: "buchhaltung@berliner-verlag.de",
      earliest: "2026-05-08",
      latest: "2026-05-08",
      count: 1,
      amount: "€12,750.00",
      status: "overdue",
      statusLabel: "Overdue · 1d",
      channel: EMAIL,
    },
    children: [
      { id: "INV-2026-0152", issued: "2026-04-08", due: "2026-05-08", amount: "€12,750.00", status: "overdue", statusLabel: "Overdue · 1d", channel: EMAIL },
    ],
  },
  {
    id: "acme",
    parent: {
      name: "Acme Industrie AG",
      email: "finance@acme-ag.de",
      earliest: "2026-05-10",
      latest: "2026-05-28",
      count: 3,
      amount: "€153,400.00",
      status: "mixed",
      statusLabel: "Mixed",
      channel: TEAMS,
    },
    children: [
      { id: "INV-2026-0156", issued: "2026-04-10", due: "2026-05-10", amount: "€96,400.00", status: "pending", statusLabel: "Pending", channel: TEAMS },
      { id: "INV-2026-0142", issued: "2026-03-21", due: "2026-04-21", amount: "€34,200.00", status: "paid", statusLabel: "Paid", channel: TEAMS },
      { id: "INV-2026-0186", issued: "2026-04-28", due: "2026-05-28", amount: "€22,800.00", status: "paid", statusLabel: "Paid", channel: TEAMS },
    ],
  },
  {
    id: "schmidt",
    parent: {
      name: "Schmidt Logistik",
      email: "ar@schmidt-log.de",
      earliest: "2026-04-30",
      latest: "2026-05-15",
      count: 2,
      amount: "€30,450.00",
      status: "paid",
      statusLabel: "Paid",
      channel: EMAIL,
    },
    children: [
      { id: "INV-2026-0163", issued: "2026-04-15", due: "2026-05-15", amount: "€21,300.00", status: "paid", statusLabel: "Paid", channel: EMAIL },
      { id: "INV-2026-0139", issued: "2026-03-30", due: "2026-04-30", amount: "€9,150.00", status: "paid", statusLabel: "Paid", channel: EMAIL },
    ],
  },
  {
    id: "fischer",
    parent: {
      name: "Fischer Holding",
      email: "kreditoren@fischer-holding.de",
      earliest: "2026-05-22",
      latest: "2026-06-04",
      count: 2,
      amount: "€201,000.00",
      status: "mixed",
      statusLabel: "Mixed",
      channel: TEAMS,
    },
    children: [
      { id: "INV-2026-0172", issued: "2026-04-22", due: "2026-05-22", amount: "€158,900.00", status: "pending", statusLabel: "Pending", channel: TEAMS },
      { id: "INV-2026-0190", issued: "2026-05-04", due: "2026-06-04", amount: "€42,100.00", status: "paid", statusLabel: "Paid", channel: TEAMS },
    ],
  },
  {
    id: "weber",
    parent: {
      name: "Weber Consulting",
      email: "hello@weber-consulting.de",
      earliest: "2026-05-25",
      latest: "2026-05-25",
      count: 1,
      amount: "€18,650.00",
      status: "draft",
      statusLabel: "Draft",
      channel: NONE,
    },
    children: [
      { id: "INV-2026-0178", issued: "2026-04-25", due: "2026-05-25", amount: "€18,650.00", status: "draft", statusLabel: "Draft", channel: NONE },
    ],
  },
];

const mono = (text: ReactNode) => (
  <span className="font-mono text-xs text-mute">{text}</span>
);

const RECEIVABLE_COLUMNS: GroupedColumn<Customer, Invoice>[] = [
  {
    key: "customer",
    header: "Customer",
    sortable: true,
    renderParent: (c) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={c.name} />
        <div className="min-w-0">
          <div className="font-medium text-text">
            {c.name}
            <span className="ml-2 rounded-full border border-charcoal bg-ink-3 px-2 py-0.5 align-middle font-mono text-[10px] text-mute">
              {c.count} invoice{c.count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="font-mono text-[11px] text-mute">{c.email}</div>
        </div>
      </div>
    ),
    renderChild: (i) => mono(i.id),
  },
  {
    key: "earliest",
    header: "Earliest due",
    sortable: true,
    renderParent: (c) => mono(c.earliest),
    renderChild: (i) => mono(i.issued),
  },
  {
    key: "latest",
    header: "Latest due",
    sortable: true,
    renderParent: (c) => mono(c.latest),
    renderChild: (i) => mono(i.due),
  },
  {
    key: "invoices",
    header: "Invoices",
    align: "right",
    sortable: true,
    renderParent: (c) => (
      <span className="tabular-nums font-semibold text-text">{c.count}</span>
    ),
    renderChild: () => <span className="text-charcoal">—</span>,
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    sortable: true,
    sorted: true,
    renderParent: (c) => (
      <span className="tabular-nums font-semibold text-text">{c.amount}</span>
    ),
    renderChild: (i) => (
      <span className="tabular-nums font-medium text-[#d8d5cc]">{i.amount}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    renderParent: (c) => <StatusBadge tone={c.status}>{c.statusLabel}</StatusBadge>,
    renderChild: (i) => <StatusBadge tone={i.status}>{i.statusLabel}</StatusBadge>,
  },
  {
    key: "channel",
    header: "Channel",
    sortable: true,
    renderParent: (c) => (
      <ChannelTag color={c.channel.color}>{c.channel.label}</ChannelTag>
    ),
    renderChild: (i) => (
      <ChannelTag color={i.channel.color}>{i.channel.label}</ChannelTag>
    ),
  },
];

function GroupedExample() {
  const ctrl = useGroupedTable(RECEIVABLES, { defaultOpen: ["mueller"] });
  return (
    <TableCard>
      <TableHeader
        title="Outstanding receivables"
        subtitle="6 customers · 11 open invoices · grouped view"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={ctrl.expandAll}>
              Expand all
            </Button>
            <Button variant="secondary" size="sm" onClick={ctrl.collapseAll}>
              Collapse all
            </Button>
          </>
        }
      />
      <TableScroll>
        <GroupedTable
          columns={RECEIVABLE_COLUMNS}
          groups={RECEIVABLES}
          controller={ctrl}
        />
      </TableScroll>
      <TableFooter
        totals={
          <div className="flex gap-[18px] font-sans tabular-nums">
            <span>
              <span className="mr-1 text-mute">Total:</span>
              <span className="font-semibold text-text">€479,850.00</span>
            </span>
            <span>
              <span className="mr-1 text-mute">Overdue:</span>
              <span className="font-semibold text-danger">€60,950.00</span>
            </span>
          </div>
        }
      >
        <span className="flex items-center gap-3">
          Page 1 / 4
          <span className="flex gap-1.5">
            <span className="grid h-[22px] w-[22px] place-items-center rounded border border-charcoal text-mute opacity-40">
              ‹
            </span>
            <span className="grid h-[22px] w-[22px] place-items-center rounded border border-charcoal text-mute">
              ›
            </span>
          </span>
        </span>
      </TableFooter>
    </TableCard>
  );
}

/* ═══════════════ 2 · Editable table ═══════════════ */

const CATEGORIES: CellOption[] = [
  { value: "Salaries & benefits", label: "Salaries & benefits", dot: "#C8B8F0", meta: "Recurring" },
  { value: "Software & tools", label: "Software & tools", dot: "#84CFC0", meta: "Recurring" },
  { value: "Marketing & growth", label: "Marketing & growth", dot: "#F0B5C8" },
  { value: "Office & operations", label: "Office & operations", dot: "#F0D89A" },
  { value: "Other", label: "Other", dot: "#7A7E84" },
];

const TYPES: CellOption[] = [
  { value: "Expense", label: "Expense", dot: "#E91E63", meta: "Outflow" },
  { value: "Income", label: "Income", dot: "#00BCD4", meta: "Inflow" },
];

const BUDGET_COLUMNS: EditableColumn[] = [
  { key: "id", header: "ID", type: "id", width: 96 },
  { key: "category", header: "Category", type: "select", required: true, width: 168, options: CATEGORIES, sectionLabel: "Categories" },
  { key: "description", header: "Description", type: "text", required: true, width: 252 },
  { key: "type", header: "Type", type: "select", required: true, width: 110, options: TYPES, sectionLabel: "Direction" },
  { key: "planned", header: "Planned", type: "number", required: true, align: "right", width: 130 },
  { key: "actual", header: "Actual", type: "number", align: "right", width: 130 },
  { key: "period", header: "Period", type: "date", width: 90 },
];

const BUDGET_ROWS: EditableRow[] = [
  { id: "BUD-2026-0301", values: { id: "BUD-2026-0301", category: "Salaries & benefits", description: "Engineering payroll · core team", type: "Expense", planned: "€96,300.00", actual: "€94,180.00", period: "Q3 2026" } },
  { id: "BUD-2026-0302", status: "edited", values: { id: "BUD-2026-0302", category: "Software & tools", description: "Cloud infrastructure (AWS)", type: "Expense", planned: "€18,000.00", actual: "€21,420.00", period: "Q3 2026" } },
  { id: "BUD-2026-0303", values: { id: "BUD-2026-0303", category: "Marketing & growth", description: "Q3 launch campaign — Daidalus channel", type: "Expense", planned: "€32,100.00", actual: "", period: "Q3 2026" } },
  { id: "BUD-2026-0304", status: "new", values: { id: "BUD-2026-0304", category: "Office & operations", description: "Co-working space · Berlin", type: "Expense", planned: "", actual: "", period: "Q3 2026" } },
  { id: "BUD-2026-0305", values: { id: "BUD-2026-0305", category: "Other", description: "Annual audit — Klein Steuerberatung", type: "Expense", planned: "€8,500.00", actual: "", period: "Q3 2026" } },
];

const parseEuro = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const fmtEuro = (n: number) =>
  "€" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function makeBudgetId(rows: EditableRow[]) {
  const max = rows.reduce((m, r) => {
    const match = /(\d+)$/.exec(r.values.id ?? "");
    return match ? Math.max(m, Number(match[1])) : m;
  }, 300);
  return `BUD-2026-0${max + 1}`;
}

function EditableExample() {
  return (
    <EditableTable
      title="Budget — Q3 2026"
      subtitle="Click any cell to edit · Tab to advance · Enter commits"
      badge={
        <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-primary/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary before:h-[5px] before:w-[5px] before:rounded-full before:bg-current before:content-['']">
          Edit mode
        </span>
      }
      columns={BUDGET_COLUMNS}
      initialRows={BUDGET_ROWS}
      makeRowId={makeBudgetId}
      addLabel="Add budget line"
      renderTotals={(rows) => {
        const planned = rows.reduce((s, r) => s + parseEuro(r.values.planned ?? ""), 0);
        const actual = rows.reduce((s, r) => s + parseEuro(r.values.actual ?? ""), 0);
        const variance = actual - planned;
        return (
          <div className="flex items-baseline gap-[22px] font-sans tabular-nums">
            <span>
              <span className="mr-1.5 text-mute">Planned:</span>
              <span className="font-semibold text-danger">{fmtEuro(planned)}</span>
            </span>
            <span>
              <span className="mr-1.5 text-mute">Actual:</span>
              <span className="font-semibold text-text">{fmtEuro(actual)}</span>
            </span>
            <span>
              <span className="mr-1.5 text-mute">Variance:</span>
              <span className="font-semibold text-primary">
                {variance < 0 ? "−" : ""}
                {fmtEuro(Math.abs(variance))}
              </span>
            </span>
          </div>
        );
      }}
    />
  );
}

export default function TablesPreviewPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-text">
        Table components
      </h1>

      <section>
        <Caption>1 · Grouped / expandable</Caption>
        <GroupedExample />
      </section>

      <section>
        <Caption>2 · Editable · in-cell editing</Caption>
        <EditableExample />
      </section>
    </main>
  );
}
