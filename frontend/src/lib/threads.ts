import { apiFetch, apiUpload } from "@/lib/api";
import type { Message, MessagesResponse } from "@/types/chat";
import type { Thread, ThreadListResponse } from "@/types/thread";

/**
 * Fetch the signed-in user's thread history from GET /api/threads.
 *
 * Errors (auth, server, network) propagate to the caller so the UI can show a
 * real error state — we never substitute placeholder data.
 */
export async function fetchThreads(): Promise<Thread[]> {
  const data = await apiFetch<ThreadListResponse>("/api/threads");
  return data.threads;
}

/**
 * Create a thread, optionally uploading a DATEV export (CSV/Excel) and a
 * master-data JSON companion. Both files are optional — a text-only session
 * is valid. The backend opens an agent session and persists the thread.
 */
export async function createThread(
  datevFile?: File,
  masterDataFile?: File,
): Promise<Thread> {
  const form = new FormData();
  if (datevFile) form.append("datev_file", datevFile);
  if (masterDataFile) form.append("master_data_file", masterDataFile);
  return apiUpload<Thread>("/api/threads", form);
}

/** Load a thread's persisted message history. */
export async function fetchMessages(threadId: string): Promise<Message[]> {
  const data = await apiFetch<MessagesResponse>(
    `/api/threads/${threadId}/messages`,
  );
  return data.messages;
}
