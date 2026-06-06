import { cn } from "@/lib/cn";

interface SpinnerProps {
  /** Diameter in px. */
  size?: number;
  className?: string;
}

/**
 * A minimal ring spinner driven by the `sm-spin` keyframes. `currentColor` is
 * used for the active arc so it inherits the surrounding text color.
 */
export function Spinner({ size = 14, className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block flex-none rounded-full", className)}
      style={{
        width: size,
        height: size,
        border: `2px solid color-mix(in srgb, currentColor 25%, transparent)`,
        borderTopColor: "currentColor",
        animation: "sm-spin 0.7s linear infinite",
      }}
    />
  );
}
