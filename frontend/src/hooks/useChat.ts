"use client";

import { useCallback, useState } from "react";

import { streamSSE } from "@/lib/api";
import { createThread, fetchMessages } from "@/lib/threads";
import type { Message } from "@/types/chat";
import type { Thread } from "@/types/thread";

// Sent as the first message when the user uploads a ledger without typing one.
const KICKOFF_PROMPT =
  "Bitte analysiere diesen Buchungsstapel und nenne die wichtigsten Beratungsansätze.";

interface UseChatOptions {
  /** Called after a new thread is created so the sidebar can refresh/select it. */
  onThreadCreated?: (thread: Thread) => void;
}

export function useChat({ onThreadCreated }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start a fresh conversation (the "New chat" action).
  const reset = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setToolStatus(null);
  }, []);

  // Switch to an existing thread and load its persisted history.
  const openConversation = useCallback(async (id: string) => {
    setConversationId(id);
    setError(null);
    setToolStatus(null);
    setMessages([]);
    try {
      setMessages(await fetchMessages(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    }
  }, []);

  // Stream one message to an existing thread, updating the assistant bubble live.
  const runStream = useCallback(async (threadId: string, text: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setLoading(true);
    setError(null);

    let assistant = "";
    const setAssistant = (content: string) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content };
        return next;
      });

    try {
      for await (const ev of streamSSE("/api/chat", { thread_id: threadId, text })) {
        if (ev.event === "token") {
          assistant += ev.data;
          setAssistant(assistant);
        } else if (ev.event === "tool_start") {
          setToolStatus(`Running ${safeTool(ev.data)}…`);
        } else if (ev.event === "tool_end") {
          setToolStatus(null);
        } else if (ev.event === "final") {
          assistant = safeContent(ev.data) || assistant;
          setAssistant(assistant);
        } else if (ev.event === "error") {
          setError(safeError(ev.data));
        } else if (ev.event === "done") {
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setToolStatus(null);
    }
  }, []);

  // Submit from the chat input: starts a thread on the first send (with or
  // without an attached file) and otherwise streams a message to the active
  // thread.
  const submit = useCallback(
    async (text: string, files: File[]) => {
      const trimmed = text.trim();
      if (loading) return;

      if (!conversationId) {
        if (!trimmed && files.length === 0) return;
        const datev = files[0];
        const master = files.find((f) => f.name.toLowerCase().endsWith(".json"));
        setLoading(true);
        setError(null);
        let thread: Thread;
        try {
          thread = await createThread(datev, master);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to start chat");
          setLoading(false);
          return;
        }
        setConversationId(thread.id);
        onThreadCreated?.(thread);
        await runStream(thread.id, trimmed || KICKOFF_PROMPT);
        return;
      }

      if (!trimmed) return;
      await runStream(conversationId, trimmed);
    },
    [conversationId, loading, onThreadCreated, runStream],
  );

  return {
    messages,
    submit,
    loading,
    toolStatus,
    error,
    reset,
    openConversation,
    conversationId,
  };
}

function safeContent(data: string): string {
  try {
    return JSON.parse(data).content ?? "";
  } catch {
    return data;
  }
}

function safeTool(data: string): string {
  try {
    return JSON.parse(data).tool ?? "tool";
  } catch {
    return "tool";
  }
}

function safeError(data: string): string {
  try {
    return JSON.parse(data).error ?? "Something went wrong";
  } catch {
    return data || "Something went wrong";
  }
}
