"use client";

import Link from "next/link";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { usePlan } from "@/components/plan-provider";

const freeFeatures = ["月50ハンドまで解析", "VPIP・PFR等の基本統計", "ハンドリプレイヤー", "ランダム練習ゲーム"];
const standardFeatures = ["月2,000ハンドまで解析", "改善・好判断ハンドの自動抽出", "日本語の判断解説", "推奨頻度・レンジ比較", "復習リストとクラウド保存"];

export default function Pricing() {
  const { user, session } = useAuth();
  const { plan } = usePlan();

  async function checkout() {
    if (!session) { location.href = "/login"; return; }
    const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await response.json();
    if (data.url) location.href = data.url;
    else alert(data.error);
  }

  return (
    <main>
      <div className="page-heading compact">
        <div><span className="eyebrow">PRICING</span><h1>シンプルな料金プラン</h1><p>まず無料で試し、解析量が増えたときだけアップグレードできます。</p></div>
        <span className="privacy"><ShieldCheck size={17}/>いつでも解約可能</span>
      </div>
      <div className="plans">
        <article>
          <b className="plan-name">FREE</b>
          <h2>¥0<small>/月</small></h2>
          <p>基本的な復習を始めたい方向け</p>
          <ul>{freeFeatures.map((feature) => <li key={feature}><Check size={16}/>{feature}</li>)}</ul>
          {plan === "free" && user ? <span className="current-plan">現在のプラン</span> : <Link href="/login">無料で始める</Link>}
        </article>
        <article className="featured">
          <span className="recommended"><Sparkles size={14}/>おすすめ</span>
          <b className="plan-name">STANDARD</b>
          <h2>¥500<small>/月（税込）</small></h2>
          <p>継続的に振り返りたい方向け</p>
          <ul>{standardFeatures.map((feature) => <li key={feature}><Check size={16}/>{feature}</li>)}</ul>
          {plan === "standard" ? <span className="current-plan">現在のプラン</span> : <button onClick={checkout}>STANDARDを始める</button>}
          <small className="billing-note">月ごとの自動更新。次回更新日前にいつでも解約できます。</small>
        </article>
      </div>
      <section className="pricing-notice">
        <h2>学習専用サービスです</h2>
        <p>賭博・入出金・賞金・ベット仲介、対戦中のカード読み取り、リアルタイム支援は提供しません。推奨頻度やEVは学習用の参考値です。</p>
      </section>
      <div className="pricing-links"><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/legal">特商法表記</Link></div>
      <style jsx>{`
        .plans{display:grid;grid-template-columns:repeat(2,minmax(0,390px));gap:22px}
        .plans article{position:relative;background:#fffefa;border:1px solid #e5e1d8;border-radius:16px;padding:30px;display:grid;gap:15px}
        .plans .featured{border:2px solid #1e6656;box-shadow:0 16px 38px #173d3414}
        .recommended{position:absolute;right:18px;top:18px;display:flex;gap:5px;align-items:center;color:#1e6656;font-size:11px;font-weight:700}
        .plan-name{font-size:11px;letter-spacing:.16em;color:#1e6656}.plans h2{font-size:36px;margin:0}.plans h2 small{font-size:12px;color:#6f7772}
        .plans p{margin:0;color:#6f7772;font-size:13px}.plans ul{list-style:none;padding:8px 0;margin:0;display:grid;gap:11px}
        .plans li{display:flex;align-items:center;gap:9px;font-size:13px}.plans li :global(svg){color:#1e6656}
        .plans button,.plans a,.current-plan{border:0;border-radius:8px;padding:14px;background:#1e6656;color:white;font-weight:700;text-align:center;cursor:pointer}
        .current-plan{background:#e8f1ed;color:#1e6656}.billing-note{font-size:10px;color:#89918d;line-height:1.6}
        .pricing-notice{max-width:802px;margin-top:24px;padding:22px 26px;border:1px solid #e5e1d8;border-radius:13px;background:#fffefa}
        .pricing-notice h2{font-size:16px;margin:0 0 7px}.pricing-notice p{font-size:11px;line-height:1.8;color:#69726e;margin:0}
        .pricing-links{display:flex;gap:20px;margin-top:20px;font-size:11px;color:#5f6d68;text-decoration:underline}
        @media(max-width:700px){.plans{grid-template-columns:1fr}.pricing-links{flex-wrap:wrap}}
      `}</style>
    </main>
  );
}
