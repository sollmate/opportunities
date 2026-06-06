"use client";

import type { Message } from "@/types/chat";

import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";

interface ChatWindowProps {
  messages: Message[];
  send: (content: string, files: File[]) => void;
  loading: boolean;
  toolStatus: string | null;
  error: string | null;
  /** True when no thread is active yet, so a file upload is needed to start. */
  requireFile: boolean;
}

export function ChatWindow({
  messages,
  send,
  loading,
  toolStatus,
  error,
  requireFile,
}: ChatWindowProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} loading={loading} toolStatus={toolStatus} />
      {error && (
        <p className="px-4 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <ChatInput onSend={send} disabled={loading} requireFile={requireFile} />
    </div>
  );
}
