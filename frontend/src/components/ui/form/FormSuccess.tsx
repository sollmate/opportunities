import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SummaryItem {
  label: ReactNode;
  value: ReactNode;
}

interface FormSuccessProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Key/value rows summarizing what was saved. */
  summary?: SummaryItem[];
  /** Next-action buttons (e.g. "View pair" / "Add another"). */
  actions?: ReactNode;
  className?: string;
}

/** Post-submit confirmation card: check badge, summary, and next actions. */
export function FormSuccess({
  title,
  subtitle,
  summary,
  actions,
  className,
}: FormSuccessProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-charcoal bg-ink-2 p-6",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-[18px] font-bold text-success">
          ✓
        </div>
        <h3 className="font-display text-[16px] font-bold tracking-[-0.01em] text-text">
          {title}
        </h3>
        {subtitle && (
          <div className="text-[12px] leading-[1.5] text-mute">{subtitle}</div>
        )}
      </div>

      {summary && summary.length > 0 && (
        <dl className="mt-4 flex flex-col divide-y divide-charcoal rounded-lg border border-charcoal">
          {summary.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 px-3 py-2 text-[12.5px]"
            >
              <dt className="text-mute">{row.label}</dt>
              <dd className="text-right text-text">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions && (
        <div className="mt-4 flex justify-center gap-2">{actions}</div>
      )}
    </div>
  );
}
