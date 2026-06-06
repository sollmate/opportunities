import { GhostMark, Icon } from "./icons";

interface SidebarLogoProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarLogo({ collapsed, onToggle }: SidebarLogoProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 pb-3.5 pt-[18px] select-none">
      <GhostMark size={28} />
      {!collapsed && (
        <span
          className="whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.01em] text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--sm-text) 0%, var(--sm-primary) 120%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          SollMate Opportunities
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={collapsed}
        className="ml-auto text-mute transition-colors hover:text-text"
      >
        <Icon name="panel" size={16} />
      </button>
    </div>
  );
}
