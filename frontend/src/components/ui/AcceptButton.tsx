import type { MouseEvent } from "react";
import { cn } from "@/lib/cn";

export type AcceptSize = "xs" | "sm" | "md";

interface AcceptButtonProps {
  size?: AcceptSize;
  /** The word that fills "Accept ___" in the label, e.g. "invoice". */
  subject?: string;
  /** Controlled resting state — once accepted the button is disabled. */
  accepted?: boolean;
  onAccept?: () => void;
  className?: string;
}

// xs · 16 · inline approval · sm · 20 · table/notification rows · md · 28 · cards.
const SIZE: Record<AcceptSize, string> = {
  xs: "h-4 w-4 rounded-[5px] text-[11px]",
  sm: "h-5 w-5 rounded-md text-[12px]",
  md: "h-7 w-7 rounded-[7px] text-[14px]",
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The affirmative counterpart to the delete button: a bare ✓ in a charcoal
 * hairline that lifts to the system cyan on hover/active. Reversible by design,
 * so it fires onAccept on a single click with no confirm step.
 */
export function AcceptButton({
  size = "md",
  subject = "item",
  accepted = false,
  onAccept,
  className,
}: AcceptButtonProps) {
  const label = accepted ? `${cap(subject)} accepted` : `Accept ${subject}`;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (!accepted) onAccept?.();
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={accepted}
      onClick={handleClick}
      className={cn(
        "inline-flex flex-none select-none items-center justify-center border font-sans leading-none transition-colors",
        SIZE[size],
        accepted
          ? "cursor-default border-info/45 bg-info/[0.12] text-info"
          : "cursor-pointer border-charcoal bg-transparent text-mute hover:border-info/45 hover:bg-info/10 hover:text-info active:bg-info/20 active:text-info",
        className,
      )}
    >
      <span className="inline-block -translate-y-[0.5px] font-bold">✓</span>
    </button>
  );
}
