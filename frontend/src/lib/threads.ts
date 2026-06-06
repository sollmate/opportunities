import { apiFetch } from "@/lib/api";
import type { Thread, ThreadListResponse } from "@/types/thread";

/**
 * Fetch the user's thread history from GET /api/threads.
 *
 * Errors (auth, server, network) propagate to the caller so the UI can show a
 * real error state — we never substitute placeholder data. Placeholder threads
 * for local development are served by the backend's stub route, not invented here.
 */
export async function fetchThreads(): Promise<Thread[]> {
  const data = await apiFetch<ThreadListResponse>("/api/threads");
  return data.threads;
}
