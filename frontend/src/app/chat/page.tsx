"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { logout } from "@/lib/auth";

export default function ChatPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

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

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-lg font-semibold">Opportunities Agent</h1>
        <button
          onClick={() => logout()}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          Sign out
        </button>
      </header>
      <ChatWindow />
    </main>
  );
}
