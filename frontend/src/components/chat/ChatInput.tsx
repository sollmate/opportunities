"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (content: string, files: File[]) => void;
  disabled: boolean;
  /** When true, attaching a DATEV file is required to start the conversation. */
  requireFile: boolean;
}

export function ChatInput({ onSend, disabled, requireFile }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  function submit() {
    if (disabled) return;
    if (!value.trim() && files.length === 0) return;
    onSend(value, files);
    setValue("");
    setFiles([]);
    if (fileInput.current) fileInput.current.value = "";
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

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  const canSend = !disabled && (value.trim().length > 0 || files.length > 0);

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-3xl flex-col gap-2 border-t border-charcoal p-4"
    >
      {requireFile && files.length === 0 && (
        <p className="text-xs text-mute">
          Attach a DATEV export (CSV/Excel) to start the conversation.
        </p>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <span
              key={f.name}
              className="flex items-center gap-1 rounded-full border border-charcoal bg-ink-2 px-3 py-1 text-xs text-text"
            >
              {f.name}
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                className="text-mute transition-colors hover:text-danger"
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={disabled}
          className="rounded-lg border border-charcoal bg-ink-2 px-3 py-2 text-sm text-mute transition-colors hover:text-text disabled:opacity-50"
          aria-label="Attach file"
          title="Attach DATEV export"
        >
          📎
        </button>
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
          disabled={!canSend}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-primary-deep hover:text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}
