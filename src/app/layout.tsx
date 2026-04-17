import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/context/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jarvis Wallet",
  description: "Voice-first TON DeFi wallet with Telegram managed bots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
    <html
    lang="en"
    className={
      `${geistSans.variable} 
      ${geistMono.variable} 
      h-full 
      antialiased`
    }
    suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive"></Script>
        <AuthProvider>
        {children}
        </AuthProvider>
      </body>
    </html>
  );
}
