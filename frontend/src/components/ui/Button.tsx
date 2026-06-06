import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "text";
export type ButtonShape = "rounded" | "pill";
export type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  shape?: ButtonShape;
  size?: ButtonSize;
  /** Chip/toggle selected state — only meaningful for shape="pill". */
  selected?: boolean;
  /** Shows a spinner and disables the button while an action is in flight. */
  loading?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  // Solid lavender — the affirmative primary action.
  primary:
    "bg-primary text-ink font-semibold hover:bg-primary-deep hover:text-white",
  // Transparent with a charcoal hairline — the neutral / cancel action.
  secondary:
    "bg-transparent text-text border border-charcoal font-medium hover:bg-white/[0.04]",
  // Borderless lavender text — low-emphasis inline action.
  ghost: "bg-transparent text-primary font-medium hover:text-primary-deep",
  // Solid magenta — destructive emphasis.
  danger: "bg-danger text-white font-semibold hover:brightness-110",
  // Borderless muted text — neutral low-emphasis action (e.g. "← Back").
  text: "bg-transparent text-mute font-medium hover:text-text",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "text-[13px] px-3 py-1.5",
  md: "text-sm px-[18px] py-2.5",
};

// Pills override padding/size for the dense chip rhythm from the mockup.
const PILL_SIZE: Record<ButtonSize, string> = {
  sm: "text-[13px] px-3 py-1.5",
  md: "text-[13px] px-3 py-1.5",
};

export function Button({
  variant = "primary",
  shape = "rounded",
  size = "md",
  selected = false,
  loading = false,
  disabled,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const isPill = shape === "pill";

  return (
    <button
      type={type}
      aria-pressed={isPill ? selected : undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex flex-none cursor-pointer items-center justify-center gap-2 font-sans transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        isPill ? "rounded-full" : "rounded-lg",
        isPill ? PILL_SIZE[size] : SIZE[size],
        // A selected pill adopts the primary fill; everything else uses its variant.
        isPill && selected
          ? "border border-primary bg-primary font-semibold text-ink"
          : isPill
            ? "border border-charcoal bg-ink-2 text-text hover:bg-ink-3"
            : VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={size === "sm" ? 12 : 14} />}
      {children}
    </button>
  );
}
