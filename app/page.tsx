"use client";

import Link from "next/link";
import { BarChart3, CheckCircle2, FileUp, Gamepad2, ShieldCheck } from "lucide-react";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "RiverNote",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
    description: "PokerCraftのハンド履歴を読み込み、対戦後に統計・リプレイ・改善点を確認できるポーカー学習ツール",
  };
  return <main className="landing">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/>
    <section className="landing-hero">
      <span className="eyebrow">POST-GAME POKER REVIEW</span>
      <h1>対戦が終わったあとに、<br/>判断を強さへ変える。</h1>
      <p>PokerCraftのハンド履歴を読み込み、VPIP・PFR・3BET・CBET、ポジション別成績、改善ハンドを日本語で振り返る無料のポーカー学習ツールです。</p>
      <div className="landing-actions"><Link href="/login?mode=signup">無料で始める</Link><Link href="/pricing" className="sub">無料プランを見る</Link></div>
      <small><ShieldCheck size={15}/>対戦中のリアルタイム支援、賭博、入出金機能はありません</small>
    </section>
    <section className="feature-grid">
      {[
        [FileUp,"履歴を読み込む","PokerCraft CSV・TXTをアップロード。2〜9人卓をハンドごとに判定します。"],
        [BarChart3,"傾向を数値で確認","VPIP、PFR、3BET、CBET、Fold to CBETを対象機会に基づいて集計します。"],
        [Gamepad2,"無料で練習","ランダムハンドをプレイし、終了後に同じ画面で判断を振り返れます。"],
      ].map(([Icon,title,text])=><article key={String(title)}><Icon size={24}/><h2>{String(title)}</h2><p>{String(text)}</p></article>)}
    </section>
    <section className="landing-detail">
      <div><span className="eyebrow">WHY RIVERNOTE</span><h2>間違いだけでなく、良い判断も残す</h2><p>改善が必要なハンドと、基準戦略に近い良い判断を分けて保存。ハンドリプレイヤーでアクションを順番に再生し、次に同じ場面が来たときの考え方を整理できます。</p></div>
      <ul>{["登録日から毎月500ハンドまで無料","紹介ボーナスは月次リセットなし","スマートフォン対応","ユーザーごとのクラウド保存"].map(item=><li key={item}><CheckCircle2 size={17}/>{item}</li>)}</ul>
    </section>
    <section className="landing-cta"><h2>まずは無料で1ハンドから</h2><p>登録後、自分のハンド履歴だけが表示されます。</p><Link href="/login?mode=signup">無料アカウントを作成</Link></section>
    <style jsx>{`
      .landing{max-width:1100px}.landing-hero{padding:55px 0 65px;max-width:850px}.landing-hero h1{font-size:52px;line-height:1.22;letter-spacing:-.05em;margin:14px 0 22px}.landing-hero p{font-size:16px;line-height:1.9;color:#65716c;max-width:760px}.landing-actions{display:flex;gap:12px;margin:28px 0 18px}.landing-actions a,.landing-cta a{padding:14px 24px;border-radius:9px;background:#1e6656;color:white;font-weight:700}.landing-actions .sub{background:#fff;border:1px solid #d8ddd9;color:#1e6656}.landing-hero small{display:flex;align-items:center;gap:7px;color:#76817c}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.feature-grid article{background:#fffefa;border:1px solid #e5e1d8;border-radius:14px;padding:26px}.feature-grid svg{color:#1e6656}.feature-grid h2{font-size:18px}.feature-grid p,.landing-detail p{font-size:12px;line-height:1.8;color:#707a75}.landing-detail{display:grid;grid-template-columns:1.2fr 1fr;gap:55px;align-items:center;padding:75px 0}.landing-detail h2{font-size:30px}.landing-detail ul{list-style:none;display:grid;gap:15px;padding:25px;background:#edf4f1;border-radius:14px}.landing-detail li{display:flex;gap:9px;align-items:center;font-size:13px}.landing-detail li svg{color:#1e6656}.landing-cta{text-align:center;background:#173d34;color:white;border-radius:16px;padding:45px}.landing-cta p{color:#b9cbc5;margin-bottom:28px}.landing-cta a{background:#e9b860;color:#173d34}@media(max-width:720px){.landing-hero{padding-top:25px}.landing-hero h1{font-size:35px}.feature-grid,.landing-detail{grid-template-columns:1fr}.landing-actions{flex-direction:column}.landing-actions a{text-align:center}}
    `}</style>
  </main>;
}
