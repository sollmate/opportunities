import type { Message } from "@/types/chat";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-primary text-ink"
            : "border border-charcoal bg-ink-2 text-text"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
