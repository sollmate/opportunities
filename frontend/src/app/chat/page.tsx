"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { getToken, logout } from "@/lib/auth";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-lg font-semibold">Opportunities Agent</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          Sign out
        </button>
      </header>
      <ChatWindow />
    </main>
  );
}
