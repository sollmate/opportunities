import type { FormEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FormCardProps {
  children: ReactNode;
  /** When set, the card renders as a <form> and wires the submit handler. */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** Marks the form busy (aria-busy) and dims the body. */
  submitting?: boolean;
  className?: string;
}

/** Card shell holding a form's header, body, and footer. */
export function FormCard({
  children,
  onSubmit,
  submitting,
  className,
}: FormCardProps) {
  const className_ = cn(
    "flex flex-col overflow-hidden rounded-xl border border-charcoal bg-ink-2",
    className,
  );
  if (onSubmit) {
    return (
      <form onSubmit={onSubmit} aria-busy={submitting || undefined} className={className_}>
        {children}
      </form>
    );
  }
  return (
    <div aria-busy={submitting || undefined} className={className_}>
      {children}
    </div>
  );
}

interface FormHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing slot, typically a <StatusPill>. */
  status?: ReactNode;
  className?: string;
}

export function FormHeader({
  title,
  subtitle,
  status,
  className,
}: FormHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-charcoal px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="font-display text-[15px] font-bold tracking-[-0.01em] text-text">
          {title}
        </h3>
        {subtitle && <div className="mt-0.5 text-[12px] text-mute">{subtitle}</div>}
      </div>
      {status}
    </div>
  );
}

export function FormBody({
  children,
  submitting,
  className,
}: {
  children: ReactNode;
  submitting?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 px-5 py-4 transition-opacity",
        submitting && "pointer-events-none opacity-60",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FormFooterProps {
  /** Convenience left-aligned helper text. Ignored if `left` is given. */
  helper?: ReactNode;
  /** Explicit left-aligned slot (e.g. a "← Back" button). */
  left?: ReactNode;
  /** Right-aligned action buttons. */
  children?: ReactNode;
  className?: string;
}

export function FormFooter({
  helper,
  left,
  children,
  className,
}: FormFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-charcoal px-5 py-3.5",
        className,
      )}
    >
      {left ??
        (helper && <span className="text-[12px] text-mute">{helper}</span>)}
      <span className="flex-1" />
      {children}
    </div>
  );
}

/** The "Reaching DATEV · 1.4s" style progress row shown during submission. */
export function SubmittingRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-mute">{children}</div>
  );
}
