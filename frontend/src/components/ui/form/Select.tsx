"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { useFieldControl } from "./Field";

export interface SelectOption {
  value: string;
  /** Accessible text label; also the fallback when no rich parts are given. */
  label: string;
  /** Color for a leading entity dot. */
  dot?: string;
  /** Monospace code shown first, e.g. "DAI-DE" or "1591". */
  code?: string;
  /** Secondary muted text, e.g. "Daidalus GmbH · EUR". */
  secondary?: string;
}

interface SelectProps {
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

function OptionContent({ option }: { option: SelectOption }) {
  const hasRich = option.dot || option.code || option.secondary;
  if (!hasRich) return <span className="truncate text-text">{option.label}</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.dot && (
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: option.dot }}
        />
      )}
      {option.code && (
        <span className="flex-none font-mono text-text">{option.code}</span>
      )}
      {option.secondary && (
        <span className="truncate text-[11px] text-mute">{option.secondary}</span>
      )}
    </span>
  );
}

/**
 * Select-only combobox (ARIA APG pattern). Focus stays on the trigger and the
 * active option is tracked with aria-activedescendant. Keyboard: Up/Down move,
 * Home/End jump, Enter/Space select, Esc closes, printable keys type-ahead.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  error,
  disabled = false,
  id,
  className,
  "aria-label": ariaLabel,
}: SelectProps) {
  const field = useFieldControl();
  const invalid = error ?? field?.invalid ?? false;
  const controlId = id ?? field?.controlId;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ buffer: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const listId = `${controlId ?? "select"}-listbox`;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  function openList() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function choose(index: number) {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function move(delta: number) {
    setActiveIndex((i) => {
      const next = i + delta;
      if (next < 0) return 0;
      if (next > options.length - 1) return options.length - 1;
      return next;
    });
  }

  function handleTypeahead(key: string) {
    const now = Date.now();
    const t = typeahead.current;
    t.buffer = now - t.at > 600 ? key : t.buffer + key;
    t.at = now;
    const match = options.findIndex((o) =>
      o.label.toLowerCase().startsWith(t.buffer.toLowerCase()),
    );
    if (match >= 0) {
      setActiveIndex(match);
      if (!open) choose(match);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (open) move(1);
        else openList();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (open) move(-1);
        else openList();
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(activeIndex);
        else openList();
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          handleTypeahead(e.key);
        }
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        id={controlId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-describedby={field?.describedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-ink-2 px-3 py-2 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          invalid
            ? "border-danger"
            : open
              ? "border-primary"
              : "border-charcoal hover:border-charcoal/80",
        )}
      >
        {selected ? (
          <OptionContent option={selected} />
        ) : (
          <span className="truncate text-mute">{placeholder}</span>
        )}
        <span
          aria-hidden
          className={cn(
            "flex-none text-mute transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          id={listId}
          aria-label={ariaLabel}
          className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-charcoal bg-ink-2 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={option.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-[13px]",
                  isActive && "bg-white/[0.06]",
                )}
              >
                <OptionContent option={option} />
                {isSelected && (
                  <span aria-hidden className="flex-none text-primary">
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
