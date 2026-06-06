"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFieldControl } from "./Field";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Leading adornment, e.g. a "€" currency symbol. */
  leftAdornment?: ReactNode;
  /** Trailing adornment, e.g. a "EUR" unit. */
  rightAdornment?: ReactNode;
  /** Force the error tone independently of the enclosing Field. */
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftAdornment, rightAdornment, error, className, id, ...rest },
  ref,
) {
  const field = useFieldControl();
  const invalid = error ?? field?.invalid ?? false;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-ink-2 px-3 py-2 text-[13px] transition-colors focus-within:border-primary",
        invalid ? "border-danger" : "border-charcoal",
        className,
      )}
    >
      {leftAdornment && (
        <span className="flex-none text-mute">{leftAdornment}</span>
      )}
      <input
        ref={ref}
        id={id ?? field?.controlId}
        aria-describedby={field?.describedBy}
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-mute"
        {...rest}
      />
      {rightAdornment && (
        <span className="flex-none text-[11px] text-mute">{rightAdornment}</span>
      )}
    </div>
  );
});
