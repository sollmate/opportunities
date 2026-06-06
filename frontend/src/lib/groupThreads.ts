import type { Thread } from "@/types/thread";

export interface ThreadGroup {
  label: string;
  threads: Thread[];
}

const DAY_LABELS = [
  "Today",
  "Yesterday",
  "Last week",
  "This month",
  "Earlier",
] as const;

type DayLabel = (typeof DAY_LABELS)[number];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function bucketFor(updatedAt: string, now: Date): DayLabel {
  const today = startOfDay(now);
  const ts = new Date(updatedAt).getTime();
  const daysAgo = Math.floor((today - startOfDay(new Date(ts))) / 86_400_000);

  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo <= 7) return "Last week";
  if (new Date(ts).getMonth() === now.getMonth() && new Date(ts).getFullYear() === now.getFullYear()) {
    return "This month";
  }
  return "Earlier";
}

/** Group threads (newest-first) into the sidebar's day sections, dropping empties. */
export function groupThreads(threads: Thread[], now: Date = new Date()): ThreadGroup[] {
  const buckets = new Map<DayLabel, Thread[]>();
  const ordered = [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  for (const thread of ordered) {
    const label = bucketFor(thread.updatedAt, now);
    const list = buckets.get(label) ?? [];
    list.push(thread);
    buckets.set(label, list);
  }
  return DAY_LABELS.filter((label) => buckets.has(label)).map((label) => ({
    label,
    threads: buckets.get(label)!,
  }));
}

const STATE_LABELS: Record<Thread["status"], string | null> = {
  idle: null,
  in_progress: "working…",
  awaiting_input: "awaiting input",
  draft: "draft saved",
};

/** Build the mono footer line for a thread card, e.g. "09:42 · 8 turns". */
export function formatWhen(thread: Thread, now: Date = new Date()): string {
  const ts = new Date(thread.updatedAt);
  const daysAgo = Math.floor(
    (startOfDay(now) - startOfDay(ts)) / 86_400_000,
  );

  const timeLabel =
    daysAgo <= 1
      ? ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })
      : ts.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const state =
    STATE_LABELS[thread.status] ??
    (thread.turnCount ? `${thread.turnCount} turn${thread.turnCount === 1 ? "" : "s"}` : null);

  return state ? `${timeLabel} · ${state}` : timeLabel;
}
