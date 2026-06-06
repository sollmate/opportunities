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
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-800">
      <textarea
        className="flex-1 resize-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700"
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
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
