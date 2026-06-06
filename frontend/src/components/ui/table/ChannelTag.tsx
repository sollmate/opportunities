import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChannelTagProps {
  children: ReactNode;
  /** Swatch color (any CSS color). Also tints the label. Defaults to muted. */
  color?: string;
  className?: string;
}

/** Mono label with a small square swatch — used for the delivery channel column. */
export function ChannelTag({ children, color, className }: ChannelTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] text-mute",
        className,
      )}
      style={color ? { color } : undefined}
    >
      <span
        aria-hidden
        className="h-2 w-2 flex-none rounded-[2px] bg-current"
      />
      {children}
    </span>
  );
}
