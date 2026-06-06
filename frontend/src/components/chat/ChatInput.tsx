"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-3xl gap-2 border-t border-charcoal p-4"
    >
      <textarea
        className="flex-1 resize-none rounded-lg border border-charcoal bg-ink-2 px-3 py-2 text-sm text-text placeholder:text-mute focus:border-primary/40 focus:outline-none"
        rows={1}
        placeholder="Type a message…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-primary-deep hover:text-white disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
