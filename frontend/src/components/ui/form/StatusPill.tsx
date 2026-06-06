import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatusTone = "draft" | "active" | "saving";

const TONE: Record<StatusTone, string> = {
  draft: "border-charcoal bg-ink text-mute",
  active: "border-success/35 bg-success/15 text-success",
  saving: "border-info/35 bg-info/15 text-info",
};

interface StatusPillProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

/** Small status pill for form headers — Draft (neutral) · Active (mint) · Saving (cyan). */
export function StatusPill({
  tone = "draft",
  children,
  className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
