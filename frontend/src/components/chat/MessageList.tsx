import type { Message } from "@/types/chat";

import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  toolStatus: string | null;
}

export function MessageList({ messages, loading, toolStatus }: MessageListProps) {
  return (
    <div className="sm-scroll mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto p-6">
      {messages.length === 0 && !loading && (
        <p className="m-auto text-sm text-mute">
          Attach a DATEV export and send a message to start the conversation.
        </p>
      )}
      {messages.map((message, i) => (
        <MessageBubble key={i} message={message} />
      ))}
      {loading && (
        <p className="text-sm text-mute" role="status">
          {toolStatus ?? "Agent is working…"}
        </p>
      )}
    </div>
  );
}
