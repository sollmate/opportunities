import { getSession } from "next-auth/react";

import type { StreamEvent } from "@/types/chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Attach the Entra access token (when present) to a Headers object. */
async function withAuth(headers: Headers): Promise<Headers> {
  const session = await getSession();
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  return headers;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await withAuth(new Headers(init.headers));
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed (${res.status})`);
  }
  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * POST a multipart form (file upload). We deliberately do NOT set Content-Type
 * so the browser adds the multipart boundary; the bearer token is still sent.
 */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const headers = await withAuth(new Headers());

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Upload to ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/**
 * POST a JSON body and stream the Server-Sent Events response.
 *
 * EventSource can't send an Authorization header, so we use fetch + a
 * ReadableStream reader and parse SSE frames by hand. This keeps the Microsoft
 * access token on the request.
 */
export async function* streamSSE(
  path: string,
  body: unknown,
): AsyncGenerator<StreamEvent> {
  const headers = await withAuth(new Headers());
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream from ${path} failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Find the next SSE frame boundary, which per spec can be \n\n, \r\n\r\n, or
  // \r\r. sse-starlette (our backend) emits \r\n line endings, so the naive
  // \n\n search misses every frame.
  const findFrameEnd = (buf: string): { index: number; sepLen: number } | null => {
    let best: { index: number; sepLen: number } | null = null;
    for (const sep of ["\r\n\r\n", "\n\n", "\r\r"] as const) {
      const i = buf.indexOf(sep);
      if (i !== -1 && (best === null || i < best.index)) {
        best = { index: i, sepLen: sep.length };
      }
    }
    return best;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let next;
    while ((next = findFrameEnd(buffer)) !== null) {
      const frame = buffer.slice(0, next.index);
      buffer = buffer.slice(next.index + next.sepLen);
      const parsed = parseFrame(frame);
      if (parsed) yield parsed;
    }
  }
}

function parseFrame(frame: string): StreamEvent | null {
  let event = "message";
  const dataParts: string[] = [];
  // Per SSE spec, lines are separated by \n, \r\n, or \r.
  for (const line of frame.split(/\r\n|\r|\n/)) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataParts.push(line.slice("data:".length).replace(/^ /, ""));
    }
  }
  if (dataParts.length === 0 && event === "message") return null;
  return { event, data: dataParts.join("\n") };
}
