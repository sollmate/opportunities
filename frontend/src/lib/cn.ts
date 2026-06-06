// Tiny class-name joiner. Filters out falsy values so conditional classes can be
// written inline (`cn("base", active && "is-active")`) without pulling in clsx.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
