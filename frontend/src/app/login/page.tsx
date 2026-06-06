"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { login } from "@/lib/auth";

function MicrosoftLogo() {
  return (
    <span
      aria-hidden
      className="inline-grid flex-none grid-cols-[8px_8px] grid-rows-[8px_8px] gap-[2px]"
    >
      <i className="block h-2 w-2 bg-[#F25022]" />
      <i className="block h-2 w-2 bg-[#7FBA00]" />
      <i className="block h-2 w-2 bg-[#00A4EF]" />
      <i className="block h-2 w-2 bg-[#FFB900]" />
    </span>
  );
}

function LoginForm() {
  const error = useSearchParams().get("error");
  const errorMessage =
    error === "AccessDenied"
      ? "Your account isn't authorized for this app."
      : error
        ? "Sign-in failed. Please try again."
        : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <span className="sm-orb sm-orb-lavender" />
        <span className="sm-orb sm-orb-cyan" />
        <span className="sm-orb sm-orb-mint" />
        <span className="sm-grain" />
      </div>

      <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sollmate-ghost.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
        />
        <span className="bg-gradient-to-r from-text to-primary bg-clip-text font-display text-base font-bold tracking-tight text-transparent">
          SollMate
        </span>
      </header>

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6 rounded-2xl border border-charcoal bg-ink-2 px-8 pt-9 pb-7 shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sollmate-ghost.png"
            alt=""
            width={56}
            height={56}
            className="mb-1.5 h-14 w-14 object-contain"
          />
          <h1 className="font-display text-[22px] font-bold tracking-tight text-text">
            Welcome to SollMate.
          </h1>
          <p className="text-[13px] leading-relaxed text-mute">
            Sign in with your work email — we use Microsoft to verify it.
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-center text-[13px] text-danger"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => login()}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] bg-primary text-sm font-semibold text-ink transition-colors hover:bg-[#B5A4E5] active:brightness-95"
        >
          <MicrosoftLogo />
          <span>Sign in</span>
        </button>
      </div>

      <p className="absolute inset-x-0 bottom-4 z-10 text-center font-mono text-[10px] tracking-wide text-[#6E7176]">
        Identity is verified by Microsoft — use the email address you were onboarded with.
      </p>
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
