import type { Message } from "@/types/chat";

import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  return (
    <div className="sm-scroll mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto p-6">
      {messages.length === 0 && !loading && (
        <p className="m-auto text-sm text-mute">
          Start the conversation by sending a message.
        </p>
      )}
      {messages.map((message, i) => (
        <MessageBubble key={i} message={message} />
      ))}
      {loading && (
        <p className="text-sm text-mute" role="status">
          Agent is typing…
        </p>
      )}
    </div>
  );
}
