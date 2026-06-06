import { GhostMark } from "./icons";

export function SidebarEmpty({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
      <div className="opacity-65">
        <GhostMark size={56} />
      </div>
      <p className="m-0 text-[12px] leading-[1.5] text-mute">
        {searching
          ? "No threads match your search. Try a different term or start a new chat."
          : "No conversations yet — start one and it'll appear here, grouped by day."}
      </p>
    </div>
  );
}
