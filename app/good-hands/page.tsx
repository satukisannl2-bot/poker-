"use client";
import Link from "next/link";
import { Award, Bookmark, ChevronRight, Sparkles } from "lucide-react";
import { usePoker } from "@/components/poker-provider";
import { useHandFilters } from "@/components/hand-filters";

export default function GoodHands(){
  const {hands,saved,toggleSaved}=usePoker();
  const base=hands.filter(h=>h.score>=80&&!h.issue).sort((a,b)=>b.score-a.score);
  const {filtered:rows,panel}=useHandFilters(base,saved);
  return <main>
    <div className="page-heading compact"><div><span className="eyebrow">BEST DECISIONS</span><h1>良かったハンド</h1><p>基準戦略に近かった判断を、強みとして振り返ります</p></div><div className="gto-pill"><Sparkles size={16}/> 戦略スコア 80点以上</div></div>
    {panel}
    <section className="good-hero"><div className="good-medal"><Award size={28}/></div><div><span>今回のベスト判断</span><strong>{rows[0]?.score??"—"}<em>/100</em></strong><p>{rows[0]?`${rows[0].position}での${rows[0].actualAction}が基準戦略と高い精度で一致しました。`:"条件に一致するハンドはありません。"}</p></div><div className="good-scale"><span>GOOD</span><i><b/></i><span>GTO</span></div></section>
    <div className="section-intro"><div><span className="eyebrow">POSITIVE REVIEW</span><h2>再現したい判断</h2></div><p>間違いだけでなく、正しい判断の理由も覚えることでプレイが安定します。</p></div>
    <section className="hand-list good-list">{rows.map((h,i)=><article className="hand-card good-card" key={h.id}>
      <div className="hand-rank">{String(i+1).padStart(2,"0")}</div><div className="cards">{h.holeCards.map(c=><span key={c} className={/[♥♦]/.test(c)?"red":""}>{c}</span>)}</div>
      <div className="hand-info"><div><b>{h.position}・{h.actualAction}の好判断</b><span className="tag good-tag">BASELINE MATCH</span></div><small>{h.playedAt} ・ {h.stakes}</small><p>{h.explanation||"基準戦略とよく一致したアクションです。"}</p></div>
      <div className="score good-score"><span>STRATEGY SCORE</span><strong>{h.score}</strong><i style={{"--score":`${h.score}%`} as React.CSSProperties}/></div>
      <button className={saved.includes(h.id)?"save active":"save"} onClick={()=>toggleSaved(h.id)} aria-label="復習リストに保存"><Bookmark size={19} fill={saved.includes(h.id)?"currentColor":"none"}/></button><Link href={`/hands/${h.id}`} className="detail-link">詳細を見る<ChevronRight size={18}/></Link>
    </article>)}</section>
    <style jsx global>{`
      .gto-pill{display:flex;align-items:center;gap:7px;border:1px solid #d6c38c;background:#fff9e8;padding:9px 13px;border-radius:20px;color:#8d6a13;font-size:11px;font-weight:600}
      .good-hero{display:grid;grid-template-columns:62px 1fr 210px;align-items:center;gap:18px;background:linear-gradient(105deg,#173d34,#245c4e);border-radius:13px;color:white;padding:24px 28px;margin-bottom:28px;box-shadow:0 12px 30px rgba(23,61,52,.12)}
      .good-medal{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#f0c66e;color:#173d34;box-shadow:0 0 0 5px #ffffff13}
      .good-hero>div:nth-child(2){display:grid}.good-hero span{font-size:9px;letter-spacing:.11em;color:#acc2bc}.good-hero strong{font-size:34px;color:#f2ce7e;margin:2px 0}.good-hero strong em{font-size:10px;color:#9db3ad;font-style:normal}.good-hero p{font-size:11px;color:#c7d4d0;margin:0}
      .good-scale{display:grid!important;grid-template-columns:auto 1fr auto;align-items:center;gap:8px}.good-scale i{height:5px;background:#ffffff23;border-radius:5px;overflow:hidden}.good-scale i b{display:block;width:96%;height:100%;background:#f0c66e}
      .section-intro{display:flex;justify-content:space-between;align-items:end;margin:0 0 16px}.section-intro h2{font-size:20px;margin:6px 0 0}.section-intro p{color:#858c87;font-size:10px;max-width:350px;line-height:1.7;margin:0}
      .good-card{border-left:3px solid #d3ad50}.good-tag{background:#fff4cf;color:#8a6715}.good-score strong{color:#b0831e}.good-score i:after{background:#d3ad50}.good-list:empty:after{content:"戦略スコア80点以上のハンドはまだありません";display:block;text-align:center;padding:50px;background:var(--paper);border:1px solid var(--line);border-radius:11px;color:#89908c;font-size:12px}
      @media(max-width:600px){.gto-pill{margin-top:18px;width:max-content}.good-hero{grid-template-columns:50px 1fr;padding:20px}.good-scale{grid-column:1/3}.section-intro{display:block}.section-intro p{margin-top:9px}}
    `}</style>
  </main>
}
