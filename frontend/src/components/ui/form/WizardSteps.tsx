"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";

export interface WizardStep {
  label: string;
}

interface WizardStepsProps {
  steps: WizardStep[];
  /** Zero-based index of the current step. */
  current: number;
  /** When provided, completed/current steps become clickable for navigation. */
  onStepClick?: (index: number) => void;
  className?: string;
}

/** Horizontal stepper: completed (✓ mint) · active (lavender) · upcoming (muted). */
export function WizardSteps({
  steps,
  current,
  onStepClick,
  className,
}: WizardStepsProps) {
  return (
    <ol className={cn("flex items-center gap-2 px-5 pt-4", className)}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = Boolean(onStepClick) && i <= current;
        return (
          <li key={step.label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 text-[12px] font-medium",
                clickable ? "cursor-pointer" : "cursor-default",
                active ? "text-text" : done ? "text-success" : "text-mute",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border text-[10px]",
                  done
                    ? "border-success bg-success/15 text-success"
                    : active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-charcoal text-mute",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px flex-1",
                  done ? "bg-success/50" : "bg-charcoal",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Lightweight step state for a wizard — current index plus next/back/goTo. */
export function useWizard(total: number, initial = 0) {
  const [step, setStep] = useState(initial);
  const next = useCallback(
    () => setStep((s) => Math.min(s + 1, total - 1)),
    [total],
  );
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);
  const goTo = useCallback(
    (i: number) => setStep(Math.max(0, Math.min(i, total - 1))),
    [total],
  );
  return {
    step,
    next,
    back,
    goTo,
    isFirst: step === 0,
    isLast: step === total - 1,
  };
}
