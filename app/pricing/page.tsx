"use client";

import Link from "next/link";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const features = [
  "登録日を基準に毎月1,000ハンドまで解析",
  "VPIP・PFR・3BET・CBETなどの統計",
  "改善ハンドと良かったハンドの自動抽出",
  "ハンドリプレイヤーと判断ガイド",
  "ランダムハンド練習ゲーム",
];

export default function Pricing() {
  const { user } = useAuth();
  return (
    <main>
      <div className="page-heading compact">
        <div>
          <span className="eyebrow">FREE EARLY ACCESS</span>
          <h1>現在は無料で利用できます</h1>
          <p>利用者が増えるまでは、すべての主要機能を無料で提供します。</p>
        </div>
        <span className="privacy"><ShieldCheck size={17}/>自動課金なし</span>
      </div>

      <article className="free-plan">
        <span className="recommended"><Sparkles size={14}/>早期アクセス</span>
        <b className="plan-name">FREE</b>
        <h2>¥0<small> / 月</small></h2>
        <p>登録日から1か月ごとの利用期間です。同じ日付を迎えると解析数がリセットされます。</p>
        <ul>{features.map((feature) => <li key={feature}><Check size={17}/>{feature}</li>)}</ul>
        {user ? <span className="current-plan">現在利用中のプラン</span> : <Link href="/login">無料で登録する</Link>}
      </article>

      <section className="pricing-notice">
        <h2>今後の有料化について</h2>
        <p>有料プランは利用者が増えた段階で検討します。開始する場合は料金と提供内容を事前に案内し、利用者が申し込まない限り自動的に有料プランへ移行したり、請求したりしません。</p>
      </section>
      <section className="pricing-notice">
        <h2>学習専用サービスです</h2>
        <p>賭博、入出金、賞金、ベット仲介、対戦中のカード読み取り、リアルタイム支援は提供しません。推奨頻度やEVは対戦後の学習用参考値です。</p>
      </section>
      <div className="pricing-links"><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/legal">特定商取引法に基づく表記</Link></div>
      <style jsx>{`
        .free-plan{position:relative;max-width:540px;background:#fffefa;border:2px solid #1e6656;border-radius:16px;padding:34px;display:grid;gap:16px;box-shadow:0 16px 38px #173d3414}
        .recommended{position:absolute;right:20px;top:20px;display:flex;gap:5px;align-items:center;color:#1e6656;font-size:11px;font-weight:700}
        .plan-name{font-size:11px;letter-spacing:.16em;color:#1e6656}.free-plan h2{font-size:40px;margin:0}.free-plan h2 small{font-size:13px;color:#6f7772}
        .free-plan p{margin:0;color:#6f7772;font-size:13px;line-height:1.8}.free-plan ul{list-style:none;padding:8px 0;margin:0;display:grid;gap:12px}
        .free-plan li{display:flex;align-items:center;gap:9px;font-size:13px}.free-plan li :global(svg){color:#1e6656}
        .free-plan a,.current-plan{border-radius:8px;padding:14px;background:#1e6656;color:white;font-weight:700;text-align:center}
        .current-plan{background:#e8f1ed;color:#1e6656}.pricing-notice{max-width:720px;margin-top:22px;padding:22px 26px;border:1px solid #e5e1d8;border-radius:13px;background:#fffefa}
        .pricing-notice h2{font-size:16px;margin:0 0 7px}.pricing-notice p{font-size:11px;line-height:1.8;color:#69726e;margin:0}
        .pricing-links{display:flex;gap:20px;margin-top:20px;font-size:11px;color:#5f6d68;text-decoration:underline}
        @media(max-width:700px){.pricing-links{flex-wrap:wrap}.free-plan{padding:26px 22px}}
      `}</style>
    </main>
  );
}
