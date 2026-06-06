"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface ConfirmDialogProps {
  /** The word that fills "Delete ___?" in the title/body, e.g. "chat". */
  subject?: string;
  /** The exact string the user must type to enable the confirm CTA. */
  confirmWord?: string;
  /** Override the default "Delete {subject}?" title. */
  title?: string;
  /** Override the default body copy. */
  body?: string;
  /** Label for the destructive CTA. Defaults to "Delete {subject}". */
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Type-to-confirm modal for irreversible destructive actions. The confirm CTA
 * stays disabled until the typed value matches `confirmWord` exactly
 * (case-sensitive). Esc or an overlay click cancels; Enter confirms on match.
 * Rendered through a portal so it escapes any clipped/positioned ancestor.
 */
export function ConfirmDialog({
  subject = "item",
  confirmWord = "SollMate",
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Keep the latest onCancel reachable without retriggering the focus effect.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // Portals need the DOM; only render after mount (also guards SSR).
  useEffect(() => setMounted(true), []);

  // Once the portal content exists, move focus into the modal, trap Tab within
  // it, and restore focus to the trigger when it closes.
  useEffect(() => {
    if (!mounted) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancelRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  const match = value === confirmWord;

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && match) onConfirm();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? `Delete ${subject}?`}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-2xl border border-charcoal bg-ink p-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-1.5 flex items-center justify-between">
          <h4 className="m-0 font-display text-[17px] font-bold tracking-[-0.01em] text-text">
            {title ?? `Delete ${subject}?`}
          </h4>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-charcoal bg-transparent text-[13px] text-mute hover:text-text"
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-[13px] leading-[1.55] text-[#c4c7cb]">
          {body ?? (
            <>
              This will permanently remove this {subject} and everything in it.{" "}
              <strong className="font-semibold text-text">
                This action cannot be undone.
              </strong>
            </>
          )}
        </p>

        <div className="mb-2 text-xs text-mute">
          To confirm, type{" "}
          <code className="rounded border border-danger/35 bg-danger-bg px-1.5 py-px font-mono text-xs text-danger">
            {confirmWord}
          </code>{" "}
          below.
        </div>

        <div
          className={cn(
            "mb-[18px] flex items-center gap-2 rounded-lg border bg-ink-2 px-2.5 py-2 font-mono text-[13px] text-text transition-colors",
            match
              ? "border-danger"
              : focused
                ? "border-primary"
                : "border-charcoal",
          )}
        >
          <input
            ref={inputRef}
            value={value}
            placeholder={confirmWord}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleInputKeyDown}
            className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] text-text outline-none placeholder:text-[#6e7176]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-charcoal bg-ink-2 px-3.5 py-2 font-sans text-[13px] font-semibold text-text transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!match}
            onClick={() => match && onConfirm()}
            className="cursor-pointer rounded-md border border-danger bg-danger px-3.5 py-2 font-sans text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:border-charcoal disabled:bg-ink-3 disabled:text-[#6e7176]"
          >
            {confirmLabel ?? `Delete ${subject}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
