"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Toggle } from "./Toggle";

interface ToggleRowProps {
  title: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Title + description on the left, switch on the right — settings-row layout. */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  className,
}: ToggleRowProps) {
  const labelId = useId();

  return (
    <div className={cn("flex items-center justify-between gap-4 py-2.5", className)}>
      <div className="min-w-0">
        <div id={labelId} className="text-[13px] font-medium text-text">
          {title}
        </div>
        {description && (
          <div className="text-[12px] leading-[1.4] text-mute">{description}</div>
        )}
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-labelledby={labelId}
      />
    </div>
  );
}
