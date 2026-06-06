"use client";

import type { Message } from "@/types/chat";

import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

interface ChatWindowProps {
  messages: Message[];
  send: (content: string) => void;
  loading: boolean;
  error: string | null;
}

export function ChatWindow({ messages, send, loading, error }: ChatWindowProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} loading={loading} />
      {error && (
        <p className="px-4 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <ChatInput onSend={send} disabled={loading} />
    </div>
  );
}
