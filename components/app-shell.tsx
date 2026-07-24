"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Award, BarChart3, CreditCard, Gamepad2, Layers3, Menu, Upload, UserRound, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/play", label: "ゲームをプレイ", icon: Gamepad2 },
  { href: "/upload", label: "ファイル読込", icon: Upload },
  { href: "/dashboard", label: "ダッシュボード", icon: BarChart3 },
  { href: "/improvements", label: "改善ハンド", icon: AlertTriangle },
  { href: "/good-hands", label: "良かったハンド", icon: Award },
  { href: "/pricing", label: "料金プラン", icon: CreditCard },
  { href: "/account", label: "アカウント", icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
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
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={path.startsWith(item.href) ? "active" : ""}>
              <item.icon size={19}/>{item.label}
            </Link>
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
        {children}
        <footer className="site-footer">
          <span>© 2026 RiverNote</span>
          <nav aria-label="法的情報">
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシー</Link>
            <Link href="/legal">特商法表記</Link>
          </nav>
          <small>対戦終了後の復習・学習専用サービス</small>
        </footer>
      </div>
      {open && <div className="backdrop" onClick={() => setOpen(false)}/>}
    </div>
  );
}
