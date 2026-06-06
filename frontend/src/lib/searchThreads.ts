import type { Thread } from "@/types/thread";

export interface SlashCommand {
  command: string;
  description: string;
}

/** Static slash-command suggestions surfaced under "Related commands" in search mode. */
const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/file", description: "prepare a USt / ELSTER filing" },
  { command: "/reconcile", description: "run a ledger reconciliation" },
  { command: "/draft", description: "draft a board note or memo" },
];

export function filterThreads(threads: Thread[], query: string): Thread[] {
  const q = query.trim().toLowerCase();
  if (!q) return threads;
  return threads.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      (t.preview?.toLowerCase().includes(q) ?? false),
  );
}

export function relatedCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SLASH_COMMANDS.filter(
    (c) => c.command.includes(q) || c.description.toLowerCase().includes(q),
  );
}

export interface TextSegment {
  text: string;
  match: boolean;
}

/** Split `text` into segments around case-insensitive occurrences of `query`. */
export function highlightSegments(text: string, query: string): TextSegment[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];

  const segments: TextSegment[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const found = lower.indexOf(needle, i);
    if (found === -1) {
      segments.push({ text: text.slice(i), match: false });
      break;
    }
    if (found > i) segments.push({ text: text.slice(i, found), match: false });
    segments.push({ text: text.slice(found, found + needle.length), match: true });
    i = found + needle.length;
  }
  return segments;
}
