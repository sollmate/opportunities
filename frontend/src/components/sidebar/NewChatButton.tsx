import { Icon } from "./icons";

interface NewChatButtonProps {
  collapsed: boolean;
  onClick: () => void;
  label?: string;
}

export function NewChatButton({
  collapsed,
  onClick,
  label = "New chat",
}: NewChatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      className="mx-3 mb-2.5 mt-1 flex h-9 flex-none items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-ink transition-colors hover:bg-primary-deep hover:text-white"
    >
      <Icon name="plus" size={14} />
      {!collapsed && label}
    </button>
  );
}
