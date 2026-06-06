"use client";

import { useChat } from "@/hooks/useChat";

import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

export function ChatWindow() {
  const { messages, send, loading, error } = useChat();

  return (
    <div className="mx-auto flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <MessageList messages={messages} loading={loading} />
      {error && (
        <p className="px-4 py-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      <ChatInput onSend={send} disabled={loading} />
    </div>
  );
}
