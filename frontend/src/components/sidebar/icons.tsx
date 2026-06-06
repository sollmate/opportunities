// Minimal stroke icons used by the sidebar, matching the design prototype.

const PATHS = {
  plus: "M12 5v14M5 12h14",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4 4",
  panel: "M4 5h16v14H4zM10 5v14",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * Placeholder ghost mark — replace with the real brand asset by dropping a PNG/SVG
 * into /public and swapping this component for an <Image>. Kept inline so nothing 404s.
 */
export function GhostMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 3c-5.5 0-9.5 4.1-9.5 9.6v13.2c0 1 1.2 1.6 2 1l2-1.5 2.4 1.7c.4.3.9.3 1.3 0l1.8-1.4 1.8 1.4c.4.3.9.3 1.3 0l2.4-1.7 2 1.5c.8.6 2 0 2-1V12.6C25.5 7.1 21.5 3 16 3Z"
        fill="var(--sm-primary)"
        fillOpacity={0.9}
      />
      <circle cx={12.5} cy={13} r={1.6} fill="var(--sm-ink)" />
      <circle cx={19.5} cy={13} r={1.6} fill="var(--sm-ink)" />
    </svg>
  );
}
