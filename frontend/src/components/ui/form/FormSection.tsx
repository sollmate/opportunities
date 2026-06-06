import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FormSectionProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Single-column section with a small mono heading (the `.sec` pattern). */
export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {title && (
        <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
          {title}
        </h4>
      )}
      {children}
    </section>
  );
}

interface FormGroupSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Two-column settings section (the `.gsec` pattern): title + description on the
 * left, controls on the right. Collapses to a single column on narrow screens.
 */
export function FormGroupSection({
  title,
  description,
  children,
  className,
}: FormGroupSectionProps) {
  return (
    <section
      className={cn(
        "grid grid-cols-1 gap-4 border-t border-charcoal py-5 first:border-t-0 first:pt-0 sm:grid-cols-[200px_1fr]",
        className,
      )}
    >
      <div>
        <h4 className="text-[13px] font-semibold text-text">{title}</h4>
        {description && (
          <p className="mt-1 text-[12px] leading-[1.5] text-mute">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

/** Lays out two (or more) fields side by side. */
export function FieldRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}
