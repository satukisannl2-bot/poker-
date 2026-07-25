import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PokerProvider } from "@/components/poker-provider";
import { AuthProvider } from "@/components/auth-provider";
import { PlanProvider } from "@/components/plan-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://poker-theta.vercel.app"),
  title: { default: "RiverNote — 無料ポーカー復習・ハンド分析ツール", template: "%s | RiverNote" },
  description: "PokerCraftのハンド履歴を読み込み、VPIP・PFR・3BET・CBET、改善ハンド、ハンドリプレイヤーを対戦後に確認できる無料ポーカー学習ツール。",
  keywords: ["ポーカー 学習","ハンド履歴 分析","PokerCraft","VPIP","PFR","3BET","CBET","ポーカー 復習"],
  openGraph: { title:"RiverNote — 無料ポーカー復習ツール", description:"PokerCraftのハンド履歴を対戦後に分析。統計・リプレイ・改善点を日本語で確認できます。", url:"/", siteName:"RiverNote", locale:"ja_JP", type:"website" },
  twitter: { card:"summary", title:"RiverNote — 無料ポーカー復習ツール", description:"対戦後のハンド分析・統計・リプレイを無料で。" },
  robots: { index: true, follow: true },
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
        <Analytics/>
        <SpeedInsights/>
      </body>
    </html>
  );
}
