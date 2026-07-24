import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PokerProvider } from "@/components/poker-provider";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "RiverNote — ポーカー復習ノート",
  description: "PokerCraftのハンド履歴を、対戦後に振り返るための学習ツール",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body><AuthProvider><PokerProvider><AppShell>{children}</AppShell></PokerProvider></AuthProvider></body>
    </html>
  );
}
