"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "./icons";

interface ThreadSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ThreadSearch({
  value,
  onChange,
  placeholder = "Search threads…",
}: ThreadSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // ⌘K / Ctrl+K focuses the search field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className={`mx-3 mb-3 flex h-[34px] flex-none items-center gap-2 rounded-lg border bg-ink-2 px-2.5 text-[13px] transition-colors ${
        focused ? "border-primary/40 text-text" : "border-charcoal text-mute"
      }`}
    >
      <Icon name="search" size={14} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Search threads"
        className="min-w-0 flex-1 bg-transparent text-text placeholder:text-mute focus:outline-none"
      />
      {!value && (
        <kbd className="rounded border border-charcoal px-1.5 py-px font-mono text-[10px] text-mute">
          ⌘K
        </kbd>
      )}
    </div>
  );
}
