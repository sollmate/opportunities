// Mirrors backend/app/schemas/chat.py — keep in sync.

export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

// POST /api/chat — sends one message to an existing thread; the reply streams
// back as Server-Sent Events (see streamSSE in lib/api.ts).
export interface ChatRequest {
  thread_id: string;
  text: string;
}

// GET /api/threads/{id}/messages
export interface MessagesResponse {
  messages: Message[];
}

// One parsed Server-Sent Event from the chat stream.
export interface StreamEvent {
  event: "token" | "tool_start" | "tool_end" | "final" | "error" | "done" | string;
  data: string;
}
