"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-200 p-6 dark:border-gray-800"
      >
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-gray-400">
          Authentication is a stub — any email and password will work.
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700"
        />
        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
