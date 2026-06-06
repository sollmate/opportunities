import { formatWhen } from "@/lib/groupThreads";
import { highlightSegments } from "@/lib/searchThreads";
import { ACTIVE_STATUSES, type Thread } from "@/types/thread";

interface ThreadCardProps {
  thread: Thread;
  active: boolean;
  query: string;
  onSelect: (id: string) => void;
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark key={i} className="sm-mark">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

export function ThreadCard({ thread, active, query, onSelect }: ThreadCardProps) {
  const showPip = ACTIVE_STATUSES.has(thread.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      aria-current={active ? "true" : undefined}
      className={`mx-2 mb-0.5 block w-[calc(100%-1rem)] rounded-[10px] px-3 py-2 text-left transition-colors ${
        active
          ? "bg-ink-2 shadow-[inset_2px_0_0_var(--sm-primary)]"
          : "hover:bg-white/[0.04]"
      }`}
    >
      <div className="mb-0.5 flex items-center gap-1.5 text-[13px] font-medium text-text">
        {showPip && (
          <span
            className="h-[5px] w-[5px] flex-none rounded-full bg-primary"
            style={{ animation: "sm-pulse 1.6s ease-out infinite" }}
          />
        )}
        <span className="min-w-0 flex-1 truncate">
          <Highlighted text={thread.title} query={query} />
        </span>
      </div>
      {thread.preview && (
        <div className="line-clamp-2 text-[11px] leading-[1.35] text-mute">
          <Highlighted text={thread.preview} query={query} />
        </div>
      )}
      <div className="mt-1 font-mono text-[9px] tracking-[0.04em] text-mute">
        {formatWhen(thread)}
      </div>
    </button>
  );
}
