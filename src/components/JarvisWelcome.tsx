"use client";

import { useEffect, useState } from "react";
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
}: JarvisWelcomeProps) {
  const [step, setStep] = useState<0 | 1 | 2>(isReturning ? 2 : 0);

  useEffect(() => {
    if (isReturning) return;
    const timer1 = setTimeout(() => setStep(1), 2500);
    const timer2 = setTimeout(() => setStep(2), 3000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isReturning]);

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[160px] relative px-4">
      <h1
        className={cn(
          "absolute font-sans text-3xl font-semibold tracking-tight transition-all duration-500",
          step === 0 ? "opacity-100 transform translate-y-0" : "opacity-0 transform -translate-y-2 pointer-events-none"
        )}
      >
        Welcome, {firstName}.
      </h1>
      
      <h1
        className={cn(
          "absolute font-sans text-2xl font-semibold tracking-tight transition-all duration-500 leading-tight text-foreground/90",
          step === 2 && !isReturning ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-2 pointer-events-none",
          isReturning && step === 2 && "hidden"
        )}
      >
        I&apos;m Jarvis, your personal wallet assistant on TON.
      </h1>

      {isReturning && (
        <h1
          className={cn(
            "absolute font-sans text-2xl font-semibold tracking-tight transition-all duration-500 leading-tight",
            step === 2 ? "opacity-100 transform translate-y-0" : "opacity-0 pointer-events-none"
          )}
        >
          Welcome back, {firstName}.<br/>
          <span className="text-muted-foreground text-lg font-medium mt-2 block">Ready for your next move.</span>
        </h1>
      )}
    </div>
  );
}
