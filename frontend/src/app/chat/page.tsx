"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useChat } from "@/hooks/useChat";
import { useThreads } from "@/hooks/useThreads";
import { getToken, logout } from "@/lib/auth";

export default function ChatPage() {
  const router = useRouter();
  const threads = useThreads();
  const chat = useChat();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  function handleNewChat() {
    threads.setActiveId(null);
    threads.setQuery("");
    chat.reset();
  }

  function handleSelect(id: string) {
    threads.setActiveId(id);
    chat.openConversation(id);
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        groups={threads.groups}
        commands={threads.commands}
        query={threads.query}
        matchCount={threads.matchCount}
        activeId={threads.activeId}
        loading={threads.loading}
        error={threads.error}
        onQueryChange={threads.setQuery}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onRetry={threads.reload}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-none items-center justify-between border-b border-charcoal px-6 py-3">
          <h1 className="text-sm font-semibold text-text">Opportunities Agent</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-mute transition-colors hover:text-text"
          >
            Sign out
          </button>
        </header>
        <ChatWindow
          messages={chat.messages}
          send={chat.send}
          loading={chat.loading}
          error={chat.error}
        />
      </main>
    </div>
  );
}
