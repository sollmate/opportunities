"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { login } from "@/lib/auth";

function LoginForm() {
  const error = useSearchParams().get("error");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-gray-400">
          Sign in with your organization Microsoft account to continue.
        </p>
        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error === "AccessDenied"
              ? "Your account isn't authorized for this app."
              : "Sign-in failed. Please try again."}
          </p>
        )}
        <button
          onClick={() => login()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in with Microsoft
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
