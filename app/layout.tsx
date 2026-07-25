import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PokerProvider } from "@/components/poker-provider";
import { AuthProvider } from "@/components/auth-provider";
import { PlanProvider } from "@/components/plan-provider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "RiverNote — ポーカー復習ノート",
  description: "PokerCraftのハンド履歴を、対戦後に振り返るためのポーカー学習ツール",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <PlanProvider>
            <PokerProvider>
              <AppShell>{children}</AppShell>
            </PokerProvider>
          </PlanProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
