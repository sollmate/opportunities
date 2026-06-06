import type { ThreadGroup } from "@/lib/groupThreads";
import type { SlashCommand } from "@/lib/searchThreads";

import { SidebarEmpty } from "./SidebarEmpty";
import { ThreadCard } from "./ThreadCard";

interface ThreadListProps {
  groups: ThreadGroup[];
  commands: SlashCommand[];
  query: string;
  matchCount: number;
  activeId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mx-6 mb-2 mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-mute first:mt-1.5">
      {children}
    </h4>
  );
}

export function ThreadList({
  groups,
  commands,
  query,
  matchCount,
  activeId,
  loading,
  error,
  onSelect,
  onRetry,
}: ThreadListProps) {
  const searching = query.trim().length > 0;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
          Loading threads…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-5 text-center">
        <p className="m-0 text-[12px] leading-[1.5] text-mute">
          Couldn&apos;t load your conversations.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-charcoal bg-ink-2 px-3 py-1.5 text-[12px] font-medium text-text transition-colors hover:border-primary/40"
        >
          Try again
        </button>
      </div>
    );
  }

  if (groups.length === 0 && commands.length === 0) {
    return (
      <div className="sm-scroll min-h-0 flex-1 overflow-y-auto">
        <SidebarEmpty searching={searching} />
      </div>
    );
  }

  return (
    <div className="sm-scroll min-h-0 flex-1 overflow-y-auto pb-3">
      {searching ? (
        <>
          {matchCount > 0 && (
            <>
              <SectionHeader>
                {matchCount} match{matchCount === 1 ? "" : "es"}
              </SectionHeader>
              {groups.flatMap((g) => g.threads).map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  active={thread.id === activeId}
                  query={query}
                  onSelect={onSelect}
                />
              ))}
            </>
          )}
          {commands.length > 0 && (
            <>
              <SectionHeader>Related commands</SectionHeader>
              {commands.map((cmd) => (
                <div
                  key={cmd.command}
                  className="mx-2 mb-0.5 rounded-[10px] px-3 py-2"
                >
                  <div className="text-[13px] font-medium text-text">
                    <span className="text-primary">{cmd.command}</span>
                    {" — "}
                    {cmd.description}
                  </div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.04em] text-mute">
                    Slash command
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <SectionHeader>{group.label}</SectionHeader>
            {group.threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                active={thread.id === activeId}
                query={query}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
