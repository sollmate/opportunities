"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "./ConfirmDialog";

export type DeleteSize = "xs" | "sm" | "md";
export type DeleteVariant = "simple" | "confirm" | "typed";

interface DeleteButtonProps {
  /** simple = one click · confirm = inline Yes/No · typed = type-to-confirm modal. */
  variant?: DeleteVariant;
  size?: DeleteSize;
  /** The word that fills "Delete ___?", e.g. "chat". */
  subject?: string;
  /** typed variant only — the string the user must type to confirm. */
  confirmWord?: string;
  onDelete?: () => void;
  className?: string;
}

// xs · 16 · chip-close · sm · 20 · dense rows · md · 28 · cards.
const SIZE: Record<DeleteSize, string> = {
  xs: "h-4 w-4 rounded-[5px] text-[12px]",
  sm: "h-5 w-5 rounded-md text-[13px]",
  md: "h-7 w-7 rounded-[7px] text-[14px]",
};

const CONFIRM_SIZE: Record<DeleteSize, string> = {
  xs: "h-4 text-[10px] px-1.5 gap-1.5",
  sm: "h-5 text-[11px] px-2 gap-1.5",
  md: "h-7 text-[12.5px] px-2.5 gap-2",
};

const BASE =
  "inline-flex flex-none select-none items-center justify-center border font-sans leading-none transition-colors";
const REST =
  "cursor-pointer border-charcoal bg-transparent text-mute hover:border-danger/45 hover:bg-danger-bg hover:text-danger active:bg-danger/[0.22] active:text-danger";

function Glyph() {
  return <span className="inline-block -translate-y-[0.5px]">×</span>;
}

/** Variant 1 — one click fires onDelete. Pair with an Undo toast for safety. */
export function DeleteSimple({
  size = "md",
  subject = "item",
  onDelete,
  className,
}: Omit<DeleteButtonProps, "variant" | "confirmWord">) {
  return (
    <button
      type="button"
      title={`Delete ${subject}`}
      aria-label={`Delete ${subject}`}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onDelete?.();
      }}
      className={cn(BASE, SIZE[size], REST, className)}
    >
      <Glyph />
    </button>
  );
}

/** Variant 2 — first click expands in-place to "Delete {subject}? Yes / No". */
export function DeleteConfirm({
  size = "md",
  subject = "item",
  onDelete,
  className,
}: Omit<DeleteButtonProps, "variant" | "confirmWord">) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        title={`Delete ${subject}`}
        aria-label={`Delete ${subject}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(BASE, SIZE[size], REST, className)}
      >
        <Glyph />
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      role="group"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        BASE,
        CONFIRM_SIZE[size],
        "w-auto whitespace-nowrap rounded-md border-danger/45 bg-danger-bg text-text",
        className,
      )}
    >
      <span className="font-medium text-text">Delete {subject}?</span>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          onDelete?.();
        }}
        className="inline-flex h-[calc(100%-6px)] cursor-pointer items-center gap-1 rounded-[5px] border-0 bg-danger px-2 font-semibold text-white transition-colors hover:brightness-110"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-full cursor-pointer border-0 bg-transparent px-1.5 text-mute transition-colors hover:text-text"
      >
        No
      </button>
    </div>
  );
}

/** Variant 3 — opens a type-to-confirm modal for irreversible deletions. */
export function DeleteTyped({
  size = "md",
  subject = "item",
  confirmWord = "SollMate",
  onDelete,
  className,
}: Omit<DeleteButtonProps, "variant">) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={`Delete ${subject}`}
        aria-label={`Delete ${subject}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(BASE, SIZE[size], REST, className)}
      >
        <Glyph />
      </button>
      {open && (
        <ConfirmDialog
          subject={subject}
          confirmWord={confirmWord}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            onDelete?.();
          }}
        />
      )}
    </>
  );
}

/**
 * Convenience dispatcher. Prefer this for the common case; reach for the named
 * sub-components (DeleteSimple / DeleteConfirm / DeleteTyped) when you need the
 * variant fixed at the call site.
 */
export function DeleteButton({
  variant = "simple",
  ...rest
}: DeleteButtonProps): ReactNode {
  if (variant === "confirm") return <DeleteConfirm {...rest} />;
  if (variant === "typed") return <DeleteTyped {...rest} />;
  return <DeleteSimple {...rest} />;
}
