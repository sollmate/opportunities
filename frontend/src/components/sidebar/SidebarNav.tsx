"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const ITEMS: NavItem[] = [
  { href: "/chat", label: "Chat", icon: "chat" },
  { href: "/masterdata", label: "Master data", icon: "data" },
];

interface SidebarNavProps {
  collapsed: boolean;
}

/** Module switcher shown under the logo: Chat · Master data. */
export function SidebarNav({ collapsed }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 pb-1.5">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex h-9 flex-none items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "bg-primary/12 text-primary"
                : "text-mute hover:bg-white/[0.04] hover:text-text",
            )}
          >
            <Icon name={item.icon} size={16} />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}
