"use client";

import { useEffect, useState } from "react";

import type { ThreadGroup } from "@/lib/groupThreads";
import type { SlashCommand } from "@/lib/searchThreads";

import { Icon } from "./icons";
import { NewChatButton } from "./NewChatButton";
import { SidebarLogo } from "./SidebarLogo";
import { ThreadList } from "./ThreadList";
import { ThreadSearch } from "./ThreadSearch";

const COLLAPSE_KEY = "sollmate.sidebar.collapsed";

interface SidebarProps {
  groups: ThreadGroup[];
  commands: SlashCommand[];
  query: string;
  matchCount: number;
  activeId: string | null;
  loading: boolean;
  onQueryChange: (q: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({
  groups,
  commands,
  query,
  matchCount,
  activeId,
  loading,
  onQueryChange,
  onSelect,
  onNewChat,
}: SidebarProps) {
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
      <NewChatButton collapsed={collapsed} onClick={onNewChat} />

      {collapsed ? (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expand sidebar to search"
          className="mx-3 flex h-[34px] flex-none items-center justify-center rounded-lg border border-charcoal bg-ink-2 text-mute transition-colors hover:text-text"
        >
          <Icon name="search" size={14} />
        </button>
      ) : (
        <>
          <ThreadSearch value={query} onChange={onQueryChange} />
          <ThreadList
            groups={groups}
            commands={commands}
            query={query}
            matchCount={matchCount}
            activeId={activeId}
            loading={loading}
            onSelect={onSelect}
          />
        </>
      )}
    </aside>
  );
}
