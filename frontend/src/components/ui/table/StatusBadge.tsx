import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TableStatusTone =
  | "paid"
  | "pending"
  | "overdue"
  | "draft"
  | "mixed";

const TONE: Record<TableStatusTone, string> = {
  paid: "text-success bg-success/12",
  pending: "text-warn bg-warn/14",
  overdue: "text-danger bg-danger/14",
  draft: "text-mute bg-mute/10",
  mixed: "text-primary bg-primary/12",
};

interface StatusBadgeProps {
  tone: TableStatusTone;
  children: ReactNode;
  className?: string;
}

/**
 * Pill badge for table status cells. A solid leading dot is drawn from the
 * current text color; the "mixed" tone swaps in a tri-color gradient bar to
 * signal that grouped rows hold more than one status.
 */
export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-medium",
        TONE[tone],
        className,
      )}
    >
      {tone === "mixed" ? (
        <span
          aria-hidden
          className="h-1 w-3 flex-none rounded-[1px]"
          style={{
            background:
              "linear-gradient(90deg, var(--sm-success) 0 33%, var(--sm-warn) 33% 66%, var(--sm-danger) 66% 100%)",
          }}
        />
      ) : (
        <span
          aria-hidden
          className="h-1.5 w-1.5 flex-none rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
}
