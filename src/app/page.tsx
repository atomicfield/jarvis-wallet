"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";

import { ChatThread } from "@/components/ChatThread";
import { JarvisWelcome } from "@/components/JarvisWelcome";
import { TelegramInit, useTelegram } from "@/components/TelegramInit";
import { VoiceOrb, type OrbState } from "@/components/VoiceOrb";
import { WalletBar } from "@/components/WalletBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTTS } from "@/hooks/useTTS";
import { useVoice } from "@/hooks/useVoice";
import { cn } from "@/lib/utils";
import {
  generateWallet,
  loadWalletFromSecureStorage,
  storeWalletInSecureStorage,
} from "@/lib/ton/wallet-client";

const QUICK_PROMPTS = [
  "Show my TON wallet balance",
  "Help me stake my TON safely",
  "Explain what I can do with Jarvis",
] as const;

const WELCOME_STORAGE_NAMESPACE = "jarvis:welcome:v1";
const APP_SHELL_CLASS =
  "relative mx-auto flex h-[var(--tg-viewport-height)] min-h-dvh w-full max-w-[480px] flex-col overflow-hidden px-[max(16px,calc(var(--tg-safe-area-inset-left)+16px))] pt-[calc(var(--tg-safe-area-inset-top)+10px)] pb-[max(14px,calc(var(--tg-safe-area-inset-bottom)+14px))] pr-[max(16px,calc(var(--tg-safe-area-inset-right)+16px))]";
const LOADER_MESSAGES = [
  "Preparing for an agentic future...",
  "Readying your wallet...",
  "Polishing experiences...",
  "Initializing intelligence...",
  "Waking Jarvis up...",
] as const;

function InitialLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % LOADER_MESSAGES.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="relative z-10 flex w-full max-w-[480px] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="size-11 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
      <div className="min-h-7">
        <AnimatePresence mode="wait">
          <motion.p
            key={LOADER_MESSAGES[messageIndex]}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="m-0 text-[0.95rem] leading-[1.6] text-zinc-300"
          >
            {LOADER_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function getWelcomeStorageKey(userId?: number) {
  return `${WELCOME_STORAGE_NAMESPACE}:${userId ?? "guest"}`;
}

function readLocalWelcomeState(key: string) {
  try {
    return window.localStorage.getItem(key) === "seen";
  } catch {
    return false;
  }
}

function writeLocalWelcomeState(key: string) {
  try {
    window.localStorage.setItem(key, "seen");
  } catch {
    // Ignore local storage restrictions in privacy modes.
  }
}

function readCloudWelcomeState(tg: TelegramWebApp, key: string) {
  return new Promise<string | null>((resolve) => {
    try {
      tg.CloudStorage.getItem(key, (error, value) => {
        if (error) {
          console.error("[Welcome] Failed to read Telegram CloudStorage:", error);
          resolve(null);
          return;
        }

        resolve(value ?? null);
      });
    } catch (error) {
      console.error("[Welcome] Telegram CloudStorage read threw:", error);
      resolve(null);
    }
  });
}

function writeCloudWelcomeState(tg: TelegramWebApp, key: string) {
  return new Promise<void>((resolve) => {
    try {
      tg.CloudStorage.setItem(key, "seen", (error) => {
        if (error) {
          console.error("[Welcome] Failed to write Telegram CloudStorage:", error);
        }

        resolve();
      });
    } catch (error) {
      console.error("[Welcome] Telegram CloudStorage write threw:", error);
      resolve();
    }
  });
}

function JarvisApp() {
  const { isReady, isTelegram, user, authError, authState } = useTelegram();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance] = useState<string | null>(null);
  const [view, setView] = useState<"voice" | "chat">("voice");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [textInput, setTextInput] = useState("");
  const [walletLoading, setWalletLoading] = useState(true);
  const [welcomeMode, setWelcomeMode] = useState<"first" | "returning">("first");
  const [welcomeReady, setWelcomeReady] = useState(false);
  const [newMnemonic, setNewMnemonic] = useState<string[] | null>(null);

  const {
    transcript,
    isListening,
    resetTranscript,
    startListening,
    stopListening,
  } = useVoice();
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let active = true;

    async function syncWalletToFirestore(address: string) {
      try {
        await fetch("/api/wallet/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });
      } catch (err) {
        console.warn("[Wallet] Failed to sync address to Firestore:", err);
      }
    }

    async function initWallet() {
      try {
        const storedWallet = await loadWalletFromSecureStorage();
        if (!active) {
          return;
        }

        if (storedWallet) {
          setWalletAddress(storedWallet.address);
          void syncWalletToFirestore(storedWallet.address);
          return;
        }

        const wallet = await generateWallet();
        if (!active) {
          return;
        }

        setNewMnemonic(wallet.mnemonic);

        const stored = await storeWalletInSecureStorage(
          wallet.mnemonic,
          wallet.address,
        );

        if (!active) {
          return;
        }

        if (!stored) {
          console.error("[Wallet] Failed to store wallet in Telegram SecureStorage");
        }

        setWalletAddress(wallet.address);
        void syncWalletToFirestore(wallet.address);
      } catch (error) {
        console.error("[Wallet] Init error:", error);
      } finally {
        if (active) {
          setWalletLoading(false);
        }
      }
    }

    void initWallet();

    return () => {
      active = false;
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let active = true;
    const key = getWelcomeStorageKey(user?.id);
    const tg = window.Telegram?.WebApp;

    async function resolveWelcomeState() {
      let seen = readLocalWelcomeState(key);

      if (!seen && tg && user?.id) {
        const cloudValue = await readCloudWelcomeState(tg, key);
        seen = cloudValue === "seen";
      }

      if (!active) {
        return;
      }

      setWelcomeMode(seen ? "returning" : "first");
      setWelcomeReady(true);

      if (!seen) {
        writeLocalWelcomeState(key);
        if (tg && user?.id) {
          void writeCloudWelcomeState(tg, key);
        }
      }
    }

    void resolveWelcomeState();

    return () => {
      active = false;
    };
  }, [isReady, user?.id]);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { walletAddress, isFirstTime: welcomeMode === "first", newMnemonic: newMnemonic?.join(" ") },
    }),
    onFinish: ({ message }: { message: UIMessage }) => {
      if (message.role !== "assistant") {
        return;
      }

      const textPart = message.parts.find((part) => part.type === "text" && part.text);
      if (textPart?.type === "text" && textPart.text) {
        setView("chat");
        speak(textPart.text);
      }
    },
    onError: () => {
      setOrbState("error");
      setTimeout(() => setOrbState("idle"), 2000);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";
  const firstName = user?.first_name?.trim() || "there";
  const inlineNotice = error?.message ?? (view === "chat" ? authError : null);
  const displayOrbState: OrbState = isLoading
    ? "processing"
    : isSpeaking
      ? "speaking"
      : orbState === "processing" || orbState === "speaking"
        ? "idle"
        : orbState;

  useEffect(() => {
    if (!isListening && transcript && orbState === "listening") {
      sendMessage({ text: transcript });
      resetTranscript();
    }
  }, [isListening, orbState, resetTranscript, sendMessage, transcript]);

  const handleOrbPress = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
      setOrbState("idle");
      return;
    }

    if (orbState === "listening") {
      stopListening();
      return;
    }

    if (isLoading) {
      return;
    }

    stopSpeaking();
    startListening();
    setOrbState("listening");
  }, [isLoading, isSpeaking, orbState, startListening, stopListening, stopSpeaking]);

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      if (isLoading) {
        return;
      }

      stopSpeaking();
      resetTranscript();
      setView("chat");
      sendMessage({ text: prompt });
    },
    [isLoading, resetTranscript, sendMessage, stopSpeaking],
  );

  const handleTextSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!textInput.trim() || isLoading) {
        return;
      }

      sendMessage({ text: textInput });
      setTextInput("");
    },
    [isLoading, sendMessage, textInput],
  );

  if (!isReady || walletLoading || !welcomeReady) {
    return (
      <div className={cn(APP_SHELL_CLASS, "items-center justify-center")}>
        <InitialLoader />
      </div>
    );
  }

  return (
    <div className={cn(APP_SHELL_CLASS, "gap-3")}>
      <WalletBar
        address={walletAddress}
        balance={walletBalance}
        isConnected={Boolean(walletAddress)}
      />

      <div className="relative z-10 inline-flex self-center rounded-full border border-white/10 bg-zinc-900/70 p-1 backdrop-blur-xl">
        <Button
          variant={view === "voice" ? "secondary" : "ghost"}
          size="sm"
          className="min-w-[86px] rounded-full text-[0.7rem] font-semibold tracking-[0.16em] uppercase max-sm:min-w-[74px]"
          onClick={() => setView("voice")}
        >
          Voice
        </Button>
        <Button
          variant={view === "chat" ? "secondary" : "ghost"}
          size="sm"
          className="min-w-[86px] rounded-full text-[0.7rem] font-semibold tracking-[0.16em] uppercase max-sm:min-w-[74px]"
          onClick={() => setView("chat")}
        >
          Chat
        </Button>
      </div>

      {inlineNotice && (
        <div className="relative z-10 rounded-[14px] border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-[0.8rem] leading-[1.4] text-zinc-300">
          {inlineNotice}
        </div>
      )}

      {view === "voice" ? (
        <section className="relative z-10 flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-2">
            <JarvisWelcome
              firstName={firstName}
              isReturning={welcomeMode === "returning"}
              isTelegram={isTelegram}
              isWalletReady={Boolean(walletAddress)}
              authState={authState}
              authError={authError}
            />

            {welcomeMode === "first" && newMnemonic && (
              <div className="rounded-[18px] border border-white/10 bg-zinc-900/70 p-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000 fill-mode-both">
                <p className="mb-2 text-[0.8rem] leading-[1.45] text-zinc-300">
                  Your wallet was created. Say each recovery word back to verify it.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {newMnemonic.map((word) => (
                    <Badge
                      key={word}
                      variant="secondary"
                      className="border border-white/15 bg-white/5 font-mono text-[0.72rem] text-zinc-200"
                    >
                      {word}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                type="button"
                className="h-auto min-h-11 justify-start rounded-[14px] border-white/10 bg-zinc-900/70 px-3 py-2.5 text-left leading-[1.35] text-zinc-300 whitespace-normal hover:border-white/20 hover:bg-zinc-800/70 hover:text-foreground"
                disabled={isLoading}
                onClick={() => handleQuickPrompt(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>

          <VoiceOrb
            state={displayOrbState}
            onPress={handleOrbPress}
            transcript={transcript}
          />
        </section>
      ) : (
        <>
          <ChatThread messages={messages} isLoading={isLoading} />

          <div className="pointer-events-none absolute right-[max(16px,calc(var(--tg-safe-area-inset-right)+16px))] bottom-[calc(92px+var(--tg-content-safe-area-inset-bottom))] z-20">
            <Button
              size="icon-lg"
              className={cn(
                "pointer-events-auto size-12 rounded-full border-0 text-foreground shadow-[0_24px_60px_rgba(2,6,16,0.55)] transition-transform duration-200 active:scale-95",
                displayOrbState === "listening"
                  ? "bg-zinc-700"
                  : "bg-zinc-800",
              )}
              onClick={handleOrbPress}
              aria-label="Voice input"
            >
              <div className="text-zinc-100" style={{ transform: "scale(0.6)" }}>
                {displayOrbState === "listening" ? (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="4" y1="8" x2="4" y2="16" className="origin-center animate-pulse motion-reduce:animate-none [animation-delay:0ms]" />
                    <line x1="8" y1="5" x2="8" y2="19" className="origin-center animate-pulse motion-reduce:animate-none [animation-delay:80ms]" />
                    <line x1="12" y1="3" x2="12" y2="21" className="origin-center animate-pulse motion-reduce:animate-none [animation-delay:160ms]" />
                    <line x1="16" y1="5" x2="16" y2="19" className="origin-center animate-pulse motion-reduce:animate-none [animation-delay:240ms]" />
                    <line x1="20" y1="8" x2="20" y2="16" className="origin-center animate-pulse motion-reduce:animate-none [animation-delay:320ms]" />
                  </svg>
                ) : (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </div>
            </Button>
          </div>

          <form
            className="relative z-10 mt-1 flex items-center gap-2.5 rounded-[22px] border border-white/10 bg-zinc-900/85 p-3 backdrop-blur-xl"
            onSubmit={handleTextSubmit}
          >
            <input
              className="h-11 flex-1 rounded-2xl border-0 bg-white/5 px-3.5 text-foreground outline-none placeholder:text-zinc-500"
              type="text"
              placeholder="Ask Jarvis anything about your wallet..."
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
            />
            <Button
              size="icon"
              className="size-[42px] rounded-full border-0 bg-zinc-200 text-zinc-900 shadow-[0_12px_30px_rgba(255,255,255,0.12)] transition-transform duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
              type="submit"
              disabled={!textInput.trim() || isLoading}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <TelegramInit>
      <JarvisApp />
    </TelegramInit>
  );
}
