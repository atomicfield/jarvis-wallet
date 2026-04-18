"use client";

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
  const eyebrow = isReturning ? "Welcome back" : "Welcome";
  const primaryCopy = isReturning
    ? "Your wallet, Telegram session, and voice controls are standing by."
    : "I’m Jarvis, your personal AI wallet assistant.";
  const secondaryCopy = isReturning
    ? "Pick up where you left off or speak to start a new move on TON."
    : "Let’s get you initialized and ready to manage TON with voice or chat.";

  return (
    <section className="jarvis-welcome-panel">
      <div className="jarvis-welcome-copy">
        <div className="jarvis-welcome-eyebrow">{eyebrow}</div>
        <h1 className="jarvis-welcome-title">Hi, {firstName}.</h1>
        <p className="jarvis-welcome-lead">{primaryCopy}</p>
        <p className="jarvis-welcome-body">{secondaryCopy}</p>
      </div>

      <div className="jarvis-status-row" aria-label="Initialization status">
        <StatusPill
          label={isTelegram ? "Telegram live" : "Browser preview"}
          tone={isTelegram ? "active" : "muted"}
        />
        <StatusPill label="Gemini core" tone="active" />
        <StatusPill
          label={isWalletReady ? "Wallet secured" : "Wallet loading"}
          tone={isWalletReady ? "active" : "pending"}
        />
      </div>

      <div className="jarvis-presence-row">
        <span className="jarvis-presence-label">
          {authState === "authenticated" && "Telegram identity linked"}
          {authState === "authenticating" && "Linking your Telegram identity"}
          {authState === "error" && "Telegram auth needs attention"}
          {authState === "idle" && "Awaiting Telegram session"}
        </span>
        {authError && <span className="jarvis-presence-error">{authError}</span>}
      </div>
    </section>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "active" | "pending" | "muted";
}) {
  return <span className={`jarvis-status-pill ${tone}`}>{label}</span>;
}
