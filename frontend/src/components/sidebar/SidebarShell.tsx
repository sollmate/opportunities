"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Icon } from "./icons";
import { SidebarLogo } from "./SidebarLogo";
import { SidebarNav } from "./SidebarNav";

const COLLAPSE_KEY = "sollmate.sidebar.collapsed";

interface SidebarShellProps {
  /** Primary action button under the nav (e.g. New chat / New client). */
  topAction?: (collapsed: boolean) => ReactNode;
  /** Body content, hidden while collapsed. */
  children?: ReactNode;
  /** Rendered in place of children while collapsed (e.g. a search affordance). */
  collapsedBody?: (toggle: () => void) => ReactNode;
}

/**
 * Shared sidebar chrome used by every module: the gradient aside, the
 * collapse toggle + persisted state, the logo, and the module nav. Modules
 * supply their own body (thread list, etc.) as children.
 */
export function SidebarShell({
  topAction,
  children,
  collapsedBody,
}: SidebarShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className="flex h-full flex-none flex-col overflow-hidden border-r border-charcoal text-text"
      style={{
        width: collapsed ? 64 : 280,
        background:
          "linear-gradient(180deg, var(--sm-ink) 0%, var(--sm-ink-2) 100%)",
      }}
    >
      <SidebarLogo collapsed={collapsed} onToggle={toggleCollapsed} />
      <SidebarNav collapsed={collapsed} />
      {topAction?.(collapsed)}

      {collapsed
        ? collapsedBody?.(toggleCollapsed) ?? null
        : children}
    </aside>
  );
}

/** Default collapsed affordance: a search button that expands the sidebar. */
export function CollapsedSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Expand sidebar to search"
      className="mx-3 flex h-[34px] flex-none items-center justify-center rounded-lg border border-charcoal bg-ink-2 text-mute transition-colors hover:text-text"
    >
      <Icon name="search" size={14} />
    </button>
  );
}
