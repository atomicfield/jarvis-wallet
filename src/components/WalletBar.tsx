"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WalletBarProps {
  address: string | null;
  balance: string | null;
}

export function WalletBar({ address, balance }: WalletBarProps) {
  const [copied, setCopied] = useState(false);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "No wallet";

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="relative z-10 flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-zinc-950/88 p-3 shadow-[0_14px_36px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[0.64rem] font-medium tracking-[0.18em] text-zinc-500">
            Your address
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto max-w-[170px] justify-start overflow-hidden px-0 py-0 font-mono text-xs text-ellipsis whitespace-nowrap text-foreground/90 hover:bg-transparent hover:text-foreground max-sm:max-w-[132px]"
            onClick={handleCopy}
            title={address ?? "No wallet"}
          >
            {copied ? "Address copied" : truncatedAddress}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {balance ? (
          <Badge
            variant="secondary"
            className="rounded-full border border-white/15 bg-white/8 font-mono text-[0.74rem] tracking-[0.02em] text-zinc-100"
          >
            {balance} TON
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
