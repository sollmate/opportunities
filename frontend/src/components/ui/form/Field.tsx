"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldContextValue {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Read the enclosing Field's id/aria wiring from a control component. */
export function useFieldControl(): FieldContextValue | null {
  return useContext(FieldContext);
}

interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  /** Helper text shown below the control when there's no error. */
  hint?: ReactNode;
  /** Error message; presence flips the control + message into the error tone. */
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Labelled field wrapper. Generates a stable control id and an aria-describedby
 * target (hint or error), exposing them through context so nested Input/Select
 * controls wire up accessibility automatically.
 */
export function Field({
  label,
  required = false,
  hint,
  error,
  children,
  className,
}: FieldProps) {
  const controlId = useId();
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={controlId} className="text-[12px] font-medium text-mute">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <FieldContext.Provider
        value={{ controlId, describedBy, invalid: Boolean(error) }}
      >
        {children}
      </FieldContext.Provider>
      {error ? (
        <div id={errorId} className="text-[11px] text-danger">
          {error}
        </div>
      ) : hint ? (
        <div id={hintId} className="text-[11px] text-mute">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
