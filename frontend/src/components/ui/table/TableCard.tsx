import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TableCardProps {
  children: ReactNode;
  className?: string;
}

/** Bordered, rounded surface that wraps a full table (header + scroll + footer). */
export function TableCard({ children, className }: TableCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-charcoal bg-ink-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TableHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small inline badge next to the title, e.g. an "Edit mode" chip. */
  badge?: ReactNode;
  /** Right-aligned controls — buttons, toggles, etc. */
  actions?: ReactNode;
  className?: string;
}

/** Title block (with optional badge + subtitle) and a right-aligned actions slot. */
export function TableHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}: TableHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-charcoal px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="flex items-center gap-2.5 font-display text-base font-bold tracking-[-0.01em] text-text">
          <span className="truncate">{title}</span>
          {badge}
        </h3>
        {subtitle && <div className="mt-0.5 text-xs text-mute">{subtitle}</div>}
      </div>
      {actions && (
        <div className="flex flex-none items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/** Uppercase mono badge used in the table header (e.g. "Edit mode"). */
export function TableBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-primary/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary before:h-[5px] before:w-[5px] before:rounded-full before:bg-current before:content-['']">
      {children}
    </span>
  );
}

interface TableScrollProps {
  children: ReactNode;
  className?: string;
}

/** Horizontal scroll container with the themed table scrollbar. */
export function TableScroll({ children, className }: TableScrollProps) {
  return (
    <div className={cn("sm-scroll-x overflow-x-auto overflow-y-hidden", className)}>
      {children}
    </div>
  );
}

interface TableFooterProps {
  /** Left-aligned content, typically a <Totals> row. */
  totals?: ReactNode;
  /** Right-aligned content — pager, save-state, etc. */
  children?: ReactNode;
  className?: string;
}

/** Footer bar: left totals slot + right slot (pager / save-state). */
export function TableFooter({ totals, children, className }: TableFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t border-charcoal px-5 py-3.5 font-mono text-[11px] text-mute",
        className,
      )}
    >
      <div>{totals}</div>
      {children}
    </div>
  );
}
