"use client";

import { cn } from "@/lib/utils";

interface JarvisWelcomeProps {
  firstName: string;
  isReturning: boolean;
  isTelegram: boolean;
  isWalletReady: boolean;
  authState: "idle" | "authenticating" | "authenticated" | "error";
  authError: string | null;
}

export function JarvisWelcome({
  firstName,
  isReturning,
  isTelegram,
  isWalletReady,
  authState,
  authError,
}: JarvisWelcomeProps) {
  const authLabel =
    authState === "authenticated"
      ? "Identity verified"
      : authState === "authenticating"
        ? "Verifying identity"
        : authState === "error"
          ? "Identity issue"
          : "Identity pending";

  return (
    <section
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/88 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    >
      <div className="relative z-10">
        <span className="mb-2 inline-flex text-[0.64rem] font-medium tracking-[0.22em] text-zinc-400">
          Jarvis Voice Wallet
        </span>
        <h1 className="m-0 text-[clamp(1.7rem,8.2vw,2.6rem)] leading-[1.04] font-semibold tracking-[-0.03em]">
          {isReturning ? "Welcome back," : "Welcome,"} {firstName}.
        </h1>
        <p className="mt-2 text-[0.95rem] leading-[1.45] font-medium text-foreground">
          {isReturning
            ? "Ready for your next move."
            : "I'm Jarvis, your assistant for secure TON actions."}
        </p>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-[0.72rem] tracking-[0.02em]",
            isTelegram
              ? "border-white/20 bg-white/10 text-zinc-100"
              : "border-white/10 bg-white/5 text-zinc-400",
          )}
        >
          {isTelegram ? "Telegram session" : "Browser preview"}
        </span>
        <span
          className={cn(
            "inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-[0.72rem] tracking-[0.02em]",
            isWalletReady
              ? "border-white/20 bg-white/10 text-zinc-100"
              : "border-white/15 bg-white/5 text-zinc-300",
          )}
        >
          {isWalletReady ? "Wallet connected" : "Preparing wallet"}
        </span>
        <span
          className={cn(
            "inline-flex min-h-7 items-center justify-center rounded-full border px-2.5 py-1 text-[0.72rem] tracking-[0.02em]",
            authState === "authenticated"
              ? "border-white/20 bg-white/10 text-zinc-100"
              : authState === "error"
                ? "border-white/15 bg-white/5 text-zinc-300"
                : "border-white/10 bg-white/5 text-zinc-400",
          )}
        >
          {authLabel}
        </span>
      </div>

      {authError && (
        <div className="relative z-10 mt-2.5">
          <p className="m-0 text-[0.78rem] leading-[1.4] text-zinc-300">{authError}</p>
        </div>
      )}
    </section>
  );
}
