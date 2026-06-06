"use client";

import { useCallback, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { ChatRequest, ChatResponse, Message } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start a fresh conversation (the "New chat" action).
  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  // Switch to an existing thread. Message history is owned by the agent
  // backend, so until that lands the window opens empty for the selected id.
  const openConversation = useCallback((id: string) => {
    setConversationId(id);
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || loading) return;

      const userMessage: Message = { role: "user", content: trimmed };
      const history = [...messages, userMessage];
      setMessages(history);
      setLoading(true);
      setError(null);

      try {
        const body: ChatRequest = {
          conversation_id: conversationId,
          messages: history,
        };
        const data = await apiFetch<ChatResponse>("/api/chat", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setConversationId(data.conversation_id);
        setMessages((prev) => [...prev, data.message]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [messages, conversationId, loading],
  );

  return { messages, send, loading, error, reset, openConversation, conversationId };
}
