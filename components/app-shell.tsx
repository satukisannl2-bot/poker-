"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Award, BarChart3, CreditCard, Gamepad2, Home, Layers3, Menu, Share2, Upload, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AdSlot } from "@/components/ad-slot";

const protectedNav = [
  { href: "/play", label: "ゲームをプレイ", icon: Gamepad2 },
  { href: "/upload", label: "ファイル読込", icon: Upload },
  { href: "/dashboard", label: "ダッシュボード", icon: BarChart3 },
  { href: "/improvements", label: "改善ハンド", icon: AlertTriangle },
  { href: "/good-hands", label: "良かったハンド", icon: Award },
];
const publicNav = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/pricing", label: "料金プラン", icon: CreditCard },
  { href: "/affiliate", label: "紹介プログラム", icon: Share2 },
  { href: "/account", label: "アカウント", icon: UserRound },
];
const publicPaths = ["/", "/login", "/pricing", "/affiliate", "/terms", "/privacy", "/legal", "/account", "/r"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const isPublic = publicPaths.some((item) => path === item || path.startsWith(`${item}/`));
  const requiresLogin = !isPublic;
  const nav = user
    ? [publicNav[0], ...protectedNav, ...publicNav.slice(1)]
    : publicNav;

  useEffect(() => {
    if (!loading && requiresLogin && !user) {
      router.replace(`/login?next=${encodeURIComponent(path)}`);
    }
  }, [loading, requiresLogin, user, router, path]);

  const pageContent = requiresLogin && (loading || !user)
    ? <main className="auth-guard"><span className="auth-spinner"/><h1>ログインが必要です</h1><p>ゲームと分析データを安全に表示するため、ログイン画面へ移動します。</p></main>
    : children;

  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark"><Layers3 size={20}/></span>
          <span>RiverNote</span>
          <button className="close-menu" onClick={() => setOpen(false)} aria-label="メニューを閉じる"><X/></button>
        </div>
        <div className="side-label">POST-GAME REVIEW</div>
        <nav>
          {nav.map((item) => (
            <div className={
              item.href === "/" ? "nav-home"
                : item.href === "/play" ? "nav-section nav-play"
                  : item.href === "/pricing" ? "nav-section nav-account"
                    : ""
            } key={item.href}>
              {user && item.href === "/play" && <span className="nav-group-label">プレイ・分析</span>}
              {user && item.href === "/pricing" && <span className="nav-group-label">サービス・設定</span>}
              <Link href={item.href} onClick={() => setOpen(false)} className={item.href==="/" ? path==="/"?"active":"" : path.startsWith(item.href) ? "active" : ""}>
                <item.icon size={19}/>{item.label}
              </Link>
            </div>
          ))}
        </nav>
        <div className="side-note">
          <span className="status-dot"/>オフライン分析モード
          <small>対戦中の支援機能はありません</small>
        </div>
      </aside>
      <div className="content">
        <header className="mobile-header">
          <button onClick={() => setOpen(true)} aria-label="メニューを開く"><Menu/></button>
          <span>RiverNote</span>
        </header>
        {pageContent}
        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID ?? ""}/>
        <footer className="site-footer">
          <span>© 2026 RiverNote</span>
          <nav aria-label="法的情報">
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシー</Link>
            <Link href="/affiliate">広告・紹介について</Link>
          </nav>
          <small>対戦終了後の復習・学習専用サービス</small>
        </footer>
      </div>
      {open && <div className="backdrop" onClick={() => setOpen(false)}/>}
    </div>
  );
}
