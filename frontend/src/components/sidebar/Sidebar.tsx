"use client";

import type { ThreadGroup } from "@/lib/groupThreads";
import type { SlashCommand } from "@/lib/searchThreads";

import { NewChatButton } from "./NewChatButton";
import { CollapsedSearchButton, SidebarShell } from "./SidebarShell";
import { ThreadList } from "./ThreadList";
import { ThreadSearch } from "./ThreadSearch";

interface SidebarProps {
  groups: ThreadGroup[];
  commands: SlashCommand[];
  query: string;
  matchCount: number;
  activeId: string | null;
  loading: boolean;
  error: string | null;
  onQueryChange: (q: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRetry: () => void;
}

export function Sidebar({
  groups,
  commands,
  query,
  matchCount,
  activeId,
  loading,
  error,
  onQueryChange,
  onSelect,
  onNewChat,
  onRetry,
}: SidebarProps) {
  return (
    <SidebarShell
      topAction={(collapsed) => (
        <NewChatButton collapsed={collapsed} onClick={onNewChat} />
      )}
      collapsedBody={(toggle) => <CollapsedSearchButton onClick={toggle} />}
    >
      <ThreadSearch value={query} onChange={onQueryChange} />
      <ThreadList
        groups={groups}
        commands={commands}
        query={query}
        matchCount={matchCount}
        activeId={activeId}
        loading={loading}
        error={error}
        onSelect={onSelect}
        onRetry={onRetry}
      />
    </SidebarShell>
  );
}
