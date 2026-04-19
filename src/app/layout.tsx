import type { Metadata, Viewport } from "next";
import {
  Onest,
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/auth";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Jarvis Wallet — Voice-First DeFi Agent Powered Wallet on TON",
  description:
    "Your personal AI agent for DeFi on TON. Swap tokens, stake TON, and manage your wallet — all by voice.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${onest.variable} font-sans`}
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
