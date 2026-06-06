// Mirrors backend/app/schemas/chat.py — keep in sync.

export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatRequest {
  conversation_id?: string | null;
  messages: Message[];
}

export interface ChatResponse {
  conversation_id: string;
  message: Message;
}
