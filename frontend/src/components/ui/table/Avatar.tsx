import { cn } from "@/lib/cn";

interface AvatarProps {
  /** Full name; the first character is shown when no explicit initial is given. */
  name: string;
  /** Override the displayed initial. */
  initial?: string;
  className?: string;
}

/** Round initial badge for entity/customer cells. */
export function Avatar({ name, initial, className }: AvatarProps) {
  const letter = (initial ?? name.trim().charAt(0)).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-7 w-7 flex-none place-items-center rounded-full border border-charcoal bg-ink-3 text-[11px] font-semibold text-text",
        className,
      )}
    >
      {letter}
    </span>
  );
}
