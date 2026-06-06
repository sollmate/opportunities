"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "../Button";
import { CellSelect, type CellOption } from "./CellSelect";
import { TableCard, TableHeader, TableScroll, TableFooter } from "./TableCard";

export type EditableColumnType = "text" | "number" | "select" | "id" | "date";

export interface EditableColumn {
  key: string;
  header: ReactNode;
  type: EditableColumnType;
  required?: boolean;
  align?: "left" | "right";
  width?: number | string;
  /** Options for select columns. */
  options?: CellOption[];
  /** Section label shown in the select popover. */
  sectionLabel?: string;
  /** Placeholder for empty text/number cells. */
  placeholder?: string;
  /** Return false to flag the cell invalid. */
  validate?: (value: string, row: EditableRow) => boolean;
}

export type EditableRowStatus = "edited" | "new";

export interface EditableRow {
  /** Stable key; also written into any "id"-type column on create. */
  id: string;
  values: Record<string, string>;
  /** Undefined = pristine. Drives the colored left bar. */
  status?: EditableRowStatus;
}

interface EditableTableProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  columns: EditableColumn[];
  initialRows: EditableRow[];
  /** Build the id for a newly added/duplicated row. */
  makeRowId?: (rows: EditableRow[]) => string;
  /** Footer totals, recomputed from the live rows. */
  renderTotals?: (rows: EditableRow[]) => ReactNode;
  /** Called with the committed rows (statuses cleared) when Save is pressed. */
  onSave?: (rows: EditableRow[]) => void;
  addLabel?: string;
  minWidth?: number | string;
}

function isCellInvalid(
  col: EditableColumn,
  value: string,
  row: EditableRow,
): boolean {
  if (col.validate) return !col.validate(value, row);
  if (col.required && value.trim() === "") return true;
  if (col.type === "number" && col.required && !/\d/.test(value)) return true;
  return false;
}

/**
 * Controlled-internally editable grid. Cells edit in place (transparent inputs
 * that reveal on focus, or a CellSelect popover for select columns). Rows track
 * a pristine/edited/new lifecycle shown as a colored left bar, the footer
 * surfaces a live dirty count + save state, and rows can be added, duplicated,
 * or deleted.
 */
export function EditableTable({
  title,
  subtitle,
  badge,
  columns,
  initialRows,
  makeRowId,
  renderTotals,
  onSave,
  addLabel = "Add row",
  minWidth = 1052,
}: EditableTableProps) {
  const [rows, setRows] = useState<EditableRow[]>(initialRows);
  const [focusId, setFocusId] = useState<string | null>(null);
  const counter = useRef(0);

  const dirty = rows.filter((r) => r.status).length;

  const nextId = (current: EditableRow[]) => {
    if (makeRowId) return makeRowId(current);
    counter.current += 1;
    return `row-${counter.current}`;
  };

  const blankRow = (current: EditableRow[]): EditableRow => {
    const id = nextId(current);
    const values: Record<string, string> = {};
    for (const col of columns) {
      if (col.type === "id") values[col.key] = id;
      else if (col.type === "select") values[col.key] = col.options?.[0]?.value ?? "";
      else values[col.key] = "";
    }
    return { id, values, status: "new" };
  };

  function updateCell(rowId: string, key: string, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              values: { ...r.values, [key]: value },
              status: r.status === "new" ? "new" : "edited",
            }
          : r,
      ),
    );
  }

  function addRow() {
    setRows((prev) => {
      const row = blankRow(prev);
      setFocusId(row.id);
      return [...prev, row];
    });
  }

  function duplicateRow(rowId: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      if (idx < 0) return prev;
      const id = nextId(prev);
      const source = prev[idx];
      const values = { ...source.values };
      for (const col of columns) if (col.type === "id") values[col.key] = id;
      const clone: EditableRow = { id, values, status: "new" };
      setFocusId(id);
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
    });
  }

  function deleteRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  function clearStatuses(): EditableRow[] {
    return rows.map((r) => ({ id: r.id, values: r.values }));
  }

  function save() {
    const cleared = clearStatuses();
    setRows(cleared);
    onSave?.(cleared);
  }

  function discard() {
    setRows(clearStatuses());
  }

  return (
    <TableCard>
      <TableHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={discard}>
              Discard
            </Button>
            <Button size="sm" onClick={save} disabled={dirty === 0}>
              Save changes
              <span className="ml-1 font-medium opacity-70">· {dirty}</span>
            </Button>
          </>
        }
      />

      <TableScroll>
        <table
          className="w-full table-fixed border-collapse text-[13px]"
          style={{ minWidth }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "whitespace-nowrap border-b border-charcoal bg-ink-2 px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-mute",
                    col.align === "right" ? "text-right" : "text-left",
                  )}
                >
                  {col.header}
                  {col.required && (
                    <span className="ml-1 text-[11px] text-primary">*</span>
                  )}
                </th>
              ))}
              <th
                style={{ width: 76 }}
                className="border-b border-charcoal bg-ink-2 px-3 py-2.5 text-center font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-mute"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row
                key={row.id}
                row={row}
                columns={columns}
                autoFocus={row.id === focusId}
                onChange={(key, value) => updateCell(row.id, key, value)}
                onDuplicate={() => duplicateRow(row.id)}
                onDelete={() => deleteRow(row.id)}
              />
            ))}
            <tr>
              <td
                colSpan={columns.length + 1}
                className="border-b border-charcoal bg-primary/[0.04]"
              >
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-2 px-3 py-3 text-[13px] font-medium text-primary transition-colors hover:text-primary-deep"
                >
                  <span
                    aria-hidden
                    className="grid h-[18px] w-[18px] place-items-center rounded bg-primary/15 text-base leading-none"
                  >
                    +
                  </span>
                  {addLabel}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>

      <TableFooter totals={renderTotals?.(rows)}>
        <SaveState dirty={dirty} />
      </TableFooter>
    </TableCard>
  );
}

function Row({
  row,
  columns,
  autoFocus,
  onChange,
  onDuplicate,
  onDelete,
}: {
  row: EditableRow;
  columns: EditableColumn[];
  autoFocus: boolean;
  onChange: (key: string, value: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const firstEditable = columns.find((c) => c.type !== "id")?.key;

  return (
    <tr
      className={cn(
        "transition-colors hover:bg-ink-3",
        row.status === "edited" && "bg-primary/[0.05]",
      )}
    >
      {columns.map((col, ci) => {
        const value = row.values[col.key] ?? "";
        const invalid = isCellInvalid(col, value, row);
        const bar =
          ci === 0 && row.status
            ? row.status === "new"
              ? "shadow-[inset_2px_0_0_var(--sm-success)]"
              : "shadow-[inset_2px_0_0_var(--sm-primary)]"
            : undefined;
        return (
          <td
            key={col.key}
            className={cn("border-b border-charcoal p-0 align-middle", bar)}
          >
            <EditableCell
              col={col}
              value={value}
              invalid={invalid}
              autoFocus={autoFocus && col.key === firstEditable}
              onChange={(v) => onChange(col.key, v)}
            />
          </td>
        );
      })}
      <td className="border-b border-charcoal p-0 align-middle">
        <div className="flex items-center justify-center gap-1">
          <IconButton title="Duplicate" tone="primary" onClick={onDuplicate}>
            <rect x="4" y="4" width="9" height="9" rx="1.5" />
            <path d="M4 11H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v1" />
          </IconButton>
          <IconButton title="Delete" tone="danger" onClick={onDelete}>
            <path d="M3 4h10M6 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M5 4l1 9.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5L11 4" />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

const CELL_BASE =
  "block w-full border border-transparent bg-transparent px-3 py-3 text-[13px] leading-[1.4] text-inherit outline-none transition-colors rounded";
const CELL_FOCUS =
  "hover:bg-white/[0.03] focus:bg-ink-3 focus:border-primary focus:shadow-[0_0_0_3px_rgba(200,184,240,0.15)]";
const CELL_INVALID =
  "border-danger shadow-[0_0_0_3px_rgba(224,71,158,0.15)]";

function EditableCell({
  col,
  value,
  invalid,
  autoFocus,
  onChange,
}: {
  col: EditableColumn;
  value: string;
  invalid: boolean;
  autoFocus: boolean;
  onChange: (value: string) => void;
}) {
  if (col.type === "id") {
    return (
      <span className="block px-3 py-3 font-mono text-xs text-mute">
        {value}
      </span>
    );
  }

  if (col.type === "select") {
    return (
      <CellSelect
        value={value}
        onChange={onChange}
        options={col.options ?? []}
        sectionLabel={col.sectionLabel}
        invalid={invalid}
        aria-label={typeof col.header === "string" ? col.header : col.key}
      />
    );
  }

  const isNum = col.type === "number";
  return (
    <input
      type="text"
      autoFocus={autoFocus}
      value={value}
      spellCheck={false}
      inputMode={isNum ? "decimal" : undefined}
      placeholder={col.placeholder ?? (isNum ? "€0.00" : "")}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      aria-label={typeof col.header === "string" ? col.header : col.key}
      aria-invalid={invalid || undefined}
      className={cn(
        CELL_BASE,
        CELL_FOCUS,
        "placeholder:text-mute placeholder:italic",
        isNum && "text-right font-semibold tabular-nums",
        col.type === "date" && "font-mono text-xs text-mute",
        invalid && CELL_INVALID,
      )}
    />
  );
}

function IconButton({
  title,
  tone,
  onClick,
  children,
}: {
  title: string;
  tone: "primary" | "danger";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "grid h-[26px] w-[26px] place-items-center rounded text-mute transition-colors hover:bg-ink-3",
        tone === "danger" ? "hover:text-danger" : "hover:text-primary",
      )}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

function SaveState({ dirty }: { dirty: number }) {
  const saved = dirty === 0;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          saved
            ? "bg-success"
            : "bg-warn [animation:sm-pulse-soft_1.6s_infinite]",
        )}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
        {saved
          ? "Saved"
          : `${dirty} unsaved change${dirty === 1 ? "" : "s"}`}
      </span>
    </span>
  );
}
