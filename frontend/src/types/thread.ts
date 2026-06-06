// Mirrors backend/app/schemas/thread.py — keep in sync.
//
// Contract for GET /api/threads (bearer-protected):
//   { "threads": Thread[] }
// Threads are returned newest-first; the client groups them by day.

export type ThreadStatus =
  | "idle"
  | "in_progress"
  | "awaiting_input"
  | "draft";

export interface Thread {
  id: string;
  title: string;
  /** Optional 2-line preview of the latest exchange. */
  preview?: string | null;
  status: ThreadStatus;
  /** ISO-8601 timestamp of the last activity. */
  updatedAt: string;
  /** Number of turns so far, shown in the card footer when present. */
  turnCount?: number | null;
}

export interface ThreadListResponse {
  threads: Thread[];
}

/** A thread's footer status drives the pulse pip in the sidebar. */
export const ACTIVE_STATUSES: ReadonlySet<ThreadStatus> = new Set([
  "in_progress",
  "awaiting_input",
]);
