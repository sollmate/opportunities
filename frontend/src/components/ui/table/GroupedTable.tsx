"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface GroupedColumn<P, C> {
  /** Stable key for the column. */
  key: string;
  header: ReactNode;
  /** Numeric/right-aligned column. */
  align?: "left" | "right";
  /** Shows the sort affordance glyph in the header. */
  sortable?: boolean;
  /** Marks this column as the active sort (filled arrow). */
  sorted?: boolean;
  /** Column width hint (px number or any CSS width). */
  width?: number | string;
  /** Cell content for an aggregate (parent) row. */
  renderParent: (parent: P) => ReactNode;
  /** Cell content for a child row. Omit to leave child cells blank. */
  renderChild?: (child: C) => ReactNode;
}

export interface TableGroup<P, C> {
  id: string;
  parent: P;
  children: C[];
}

export interface GroupedTableController {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  openCount: number;
}

/**
 * Open/closed state for a GroupedTable. Exposed as a hook so header controls
 * (Expand all / Collapse all) can drive the same state the table renders from.
 */
export function useGroupedTable<P, C>(
  groups: TableGroup<P, C>[],
  options?: { defaultOpen?: string[] },
): GroupedTableController {
  const allIds = useMemo(() => groups.map((g) => g.id), [groups]);
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(options?.defaultOpen ?? []),
  );

  const isOpen = useCallback((id: string) => openIds.has(id), [openIds]);
  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const expandAll = useCallback(() => setOpenIds(new Set(allIds)), [allIds]);
  const collapseAll = useCallback(() => setOpenIds(new Set()), []);

  return { isOpen, toggle, expandAll, collapseAll, openCount: openIds.size };
}

interface GroupedTableProps<P, C> {
  columns: GroupedColumn<P, C>[];
  groups: TableGroup<P, C>[];
  /** Shared controller. If omitted, the table manages its own state. */
  controller?: GroupedTableController;
  /** Initial open ids when uncontrolled. */
  defaultOpen?: string[];
  /** Sticky header row (default true). */
  stickyHeader?: boolean;
  /** Minimum table width before horizontal scrolling kicks in. */
  minWidth?: number | string;
  /**
   * When set, clicking a parent row body invokes this (e.g. to select the row)
   * instead of toggling its children — the chevron cell still toggles. Omit to
   * keep the default behavior where the whole parent row toggles expansion.
   */
  onParentClick?: (parent: P) => void;
  /** Id of the currently selected group; highlights that parent row. */
  selectedId?: string;
  className?: string;
}

/**
 * Read-only table that groups child rows under expandable aggregate (parent)
 * rows. A leading expander column is added automatically: parents show a
 * rotating chevron, children indent under a "└" glyph. Cell content is supplied
 * per column via renderParent / renderChild so callers stay domain-specific.
 */
export function GroupedTable<P, C>({
  columns,
  groups,
  controller,
  defaultOpen,
  stickyHeader = true,
  minWidth = 940,
  onParentClick,
  selectedId,
  className,
}: GroupedTableProps<P, C>) {
  const internal = useGroupedTable(groups, { defaultOpen });
  const ctrl = controller ?? internal;
  const colCount = columns.length + 1; // + expander

  return (
    <table
      className={cn("w-full border-collapse text-[13px]", className)}
      style={{ minWidth }}
    >
      <thead>
        <tr>
          <th
            className={cn(
              "w-9 border-b border-charcoal bg-ink-2 px-0 pl-4.5",
              stickyHeader && "sticky top-0 z-[1]",
            )}
          />
          {columns.map((col) => (
            <th
              key={col.key}
              style={col.width ? { width: col.width } : undefined}
              className={cn(
                "select-none whitespace-nowrap border-b border-charcoal bg-ink-2 px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-mute",
                col.align === "right" ? "text-right" : "text-left",
                stickyHeader && "sticky top-0 z-[1]",
              )}
            >
              <span className="inline-flex items-center gap-1">
                {col.header}
                {col.sortable && (
                  <span
                    aria-hidden
                    className={cn(
                      "text-[10px]",
                      col.sorted ? "text-primary" : "text-charcoal",
                    )}
                  >
                    {col.sorted ? "↓" : "↕"}
                  </span>
                )}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => {
          const open = ctrl.isOpen(group.id);
          return (
            <GroupRows
              key={group.id}
              group={group}
              columns={columns}
              open={open}
              onToggle={() => ctrl.toggle(group.id)}
              colCount={colCount}
              onParentClick={onParentClick}
              selected={selectedId === group.id}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function GroupRows<P, C>({
  group,
  columns,
  open,
  onToggle,
  onParentClick,
  selected,
}: {
  group: TableGroup<P, C>;
  columns: GroupedColumn<P, C>[];
  open: boolean;
  onToggle: () => void;
  colCount: number;
  onParentClick?: (parent: P) => void;
  selected?: boolean;
}) {
  // With onParentClick the row body selects and only the chevron toggles;
  // without it the whole row toggles (original behavior).
  const onRowClick = onParentClick
    ? () => onParentClick(group.parent)
    : onToggle;
  return (
    <>
      <tr
        className={cn(
          "cursor-pointer transition-colors",
          selected ? "bg-primary/12" : "hover:bg-ink-3",
        )}
        onClick={onRowClick}
        aria-expanded={open}
        aria-selected={onParentClick ? selected ?? false : undefined}
      >
        <td className="w-9 border-b border-charcoal pl-4.5 pr-0 align-middle">
          <button
            type="button"
            aria-label={open ? "Collapse row" : "Expand row"}
            onClick={(e) => {
              if (onParentClick) e.stopPropagation();
              onToggle();
            }}
            className={cn(
              "inline-flex h-3.5 w-3.5 items-center justify-center font-mono text-[10px] leading-[14px] transition-transform",
              open ? "rotate-90 text-primary" : "text-mute",
            )}
          >
            ›
          </button>
        </td>
        {columns.map((col) => (
          <td
            key={col.key}
            className={cn(
              "border-b border-charcoal px-4 py-3 align-middle text-text",
              col.align === "right" && "text-right",
            )}
          >
            {col.renderParent(group.parent)}
          </td>
        ))}
      </tr>
      {open &&
        group.children.map((child, ci) => (
          <tr
            key={ci}
            className="bg-black/[0.18] transition-colors hover:bg-black/[0.32]"
          >
            <td className="w-9 border-b border-charcoal px-0 text-center align-middle font-mono text-[11px] text-charcoal before:content-['└']" />
            {columns.map((col) => (
              <td
                key={col.key}
                className={cn(
                  "border-b border-charcoal px-4 py-3 align-middle text-[#b9b6ae]",
                  col.align === "right" && "text-right",
                )}
              >
                {col.renderChild?.(child)}
              </td>
            ))}
          </tr>
        ))}
    </>
  );
}
