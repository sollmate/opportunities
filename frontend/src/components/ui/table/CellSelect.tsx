"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface CellOption {
  value: string;
  label: string;
  /** Leading dot color (any CSS color). */
  dot?: string;
  /** Mono meta text shown on the right, e.g. "Recurring". */
  meta?: string;
}

interface CellSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CellOption[];
  /** Uppercase section label above the option list. */
  sectionLabel?: string;
  /** Force the search box on/off. Defaults to on when there are >5 options. */
  searchable?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
}

/**
 * In-cell select that looks like a static cell at rest and opens a floating
 * portal popover (search + keyboard-navigable list) on activation. Built for
 * dense editable tables where a full-width Select would be too heavy.
 */
export function CellSelect({
  value,
  onChange,
  options,
  sectionLabel,
  searchable,
  invalid = false,
  "aria-label": ariaLabel,
}: CellSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ left: 0, top: 0, minWidth: 220 });

  useEffect(() => setMounted(true), []);

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const showSearch = searchable ?? options.length > 5;

  const position = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      left: r.left,
      top: r.bottom + 4,
      minWidth: Math.max(r.width, 220),
    });
  }, []);

  function openPopover() {
    position();
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setQuery("");
    setOpen(true);
  }

  const closePopover = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  function commit(option: CellOption | undefined) {
    if (!option) return;
    onChange(option.value);
    closePopover();
  }

  // Focus the search (or list) once the popover is mounted.
  useLayoutEffect(() => {
    if (!open) return;
    if (showSearch) searchRef.current?.focus();
    else popRef.current?.focus();
  }, [open, showSearch]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex] as
      | HTMLElement
      | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // Dismiss on outside pointer, scroll, or resize.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      closePopover(false);
    };
    const onScroll = () => closePopover(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, closePopover]);

  function moveActive(delta: number) {
    setActiveIndex((i) => {
      if (filtered.length === 0) return -1;
      const next = (i + delta + filtered.length) % filtered.length;
      return next;
    });
  }

  function handleTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPopover();
    }
  }

  function handlePopoverKey(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        break;
      case "Enter":
        e.preventDefault();
        commit(filtered[activeIndex]);
        break;
      case "Escape":
        e.preventDefault();
        closePopover();
        break;
      case "Tab":
        closePopover(false);
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? closePopover() : openPopover())}
        onKeyDown={handleTriggerKey}
        className={cn(
          "group flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-3 text-left text-[13px] outline-none transition-colors",
          open
            ? "border-primary bg-ink-3 shadow-[0_0_0_3px_rgba(200,184,240,0.15)]"
            : invalid
              ? "border-danger"
              : "border-transparent hover:bg-white/[0.03]",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          {selected?.dot && (
            <span
              aria-hidden
              className="h-2 w-2 flex-none rounded-full"
              style={{ background: selected.dot }}
            />
          )}
          <span className="truncate">{selected?.label ?? "—"}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "flex-none text-mute transition-opacity",
            open ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          ▾
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={popRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={-1}
            onKeyDown={handlePopoverKey}
            style={{
              left: coords.left,
              top: coords.top,
              minWidth: coords.minWidth,
            }}
            className="fixed z-[1000] rounded-[10px] border border-charcoal bg-ink-2 p-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)] outline-none"
          >
            {showSearch && (
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search…"
                className="mb-1 block w-full rounded-md border border-charcoal bg-ink px-2.5 py-2 text-xs text-text outline-none placeholder:text-mute focus:border-primary"
              />
            )}
            {sectionLabel && (
              <div className="px-2.5 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-mute">
                {sectionLabel}
              </div>
            )}
            <div ref={listRef} className="sm-scroll max-h-[260px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-2.5 py-3.5 text-center text-xs text-mute">
                  No matches
                </div>
              ) : (
                filtered.map((option, i) => {
                  const isSelected = option.value === value;
                  const isActive = i === activeIndex;
                  return (
                    <div
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => commit(option)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-[#e8e6df]",
                        isActive && "bg-primary/12 text-text",
                      )}
                    >
                      {option.dot && (
                        <span
                          aria-hidden
                          className="h-2 w-2 flex-none rounded-full"
                          style={{ background: option.dot }}
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {option.meta && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-mute">
                          {option.meta}
                        </span>
                      )}
                      <span
                        aria-hidden
                        className={cn(
                          "flex-none text-primary",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      >
                        ✓
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
