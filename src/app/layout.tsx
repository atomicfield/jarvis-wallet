import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  Onest,
  Geist,
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/auth";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const onest = Onest({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "variable",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Jarvis — Voice-First DeFi Agent",
  description:
    "Your personal AI agent for DeFi on TON. Swap tokens, stake TON, and manage your wallet — all by voice.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        geist.variable,
        onest.variable,
        plexMono.variable,
        cormorant.variable,
        "font-sans",
      )}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="dark" />
      </head>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js?62"
          strategy="beforeInteractive"
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
