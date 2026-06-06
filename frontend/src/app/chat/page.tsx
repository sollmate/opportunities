"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { UserMenu } from "@/components/ui";
import { useChat } from "@/hooks/useChat";
import { useThreads } from "@/hooks/useThreads";
import { logout } from "@/lib/auth";

export default function ChatPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const threads = useThreads();
  const chat = useChat();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  useEffect(() => {
    // The access token expired and couldn't be refreshed — re-authenticate
    // rather than keep sending a stale bearer token to the backend.
    if (session?.error === "RefreshTokenError") {
      signIn("microsoft-entra-id");
    }
  }, [session?.error]);

  if (status !== "authenticated") return null;

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
          <UserMenu
            name={session.user?.name ?? session.user?.email ?? "You"}
            email={session.user?.email}
            onSignOut={handleLogout}
          />
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
