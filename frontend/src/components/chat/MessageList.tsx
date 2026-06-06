import type { Message } from "@/types/chat";

import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.length === 0 && !loading && (
        <p className="m-auto text-sm text-gray-400">
          Start the conversation by sending a message.
        </p>
      )}
      {messages.map((message, i) => (
        <MessageBubble key={i} message={message} />
      ))}
      {loading && <p className="text-sm text-gray-400">Agent is typing…</p>}
    </div>
  );
}
