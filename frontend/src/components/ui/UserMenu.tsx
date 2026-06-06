"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface UserMenuProps {
  name: string;
  email?: string | null;
  onSignOut: () => void;
  align?: "left" | "right";
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function UserMenu({
  name,
  email,
  onSignOut,
  align = "right",
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = initialsFrom(name);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
        className={cn(
          "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[13px] font-semibold tracking-tight text-ink select-none",
          "bg-[linear-gradient(135deg,#84CFC0,#C8B8F0)]",
          "transition-shadow duration-150 hover:shadow-[0_0_0_2px_rgba(200,184,240,0.4)]",
          open && "shadow-[0_0_0_2px_rgba(200,184,240,0.7)]",
        )}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-[calc(100%+6px)] z-30 w-[260px] rounded-xl border border-charcoal bg-ink p-1.5",
            "shadow-[0_18px_48px_rgba(0,0,0,0.55)] animate-[um-in_180ms_cubic-bezier(0.2,0.7,0.2,1)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center gap-3 px-2.5 pt-2.5 pb-3">
            <div
              className={cn(
                "flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-semibold text-ink",
                "bg-[linear-gradient(135deg,#84CFC0,#C8B8F0)]",
              )}
            >
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-semibold text-text">
                {name}
              </div>
              {email && (
                <div className="mt-0.5 truncate font-mono text-[10px] tracking-wide text-mute">
                  {email}
                </div>
              )}
            </div>
          </div>

          <div className="my-1 h-px bg-charcoal" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-[#E07A5F]",
              "transition-colors hover:bg-[rgba(224,122,95,0.08)]",
            )}
          >
            <span className="inline-flex flex-none text-[#E07A5F]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </span>
            <span className="flex-1 text-left">Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
