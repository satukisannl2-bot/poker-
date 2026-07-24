"use client";
import Link from "next/link";
import { Bookmark, ChevronRight } from "lucide-react";
import { usePoker } from "@/components/poker-provider";
import { useHandFilters } from "@/components/hand-filters";

export default function Improvements(){
 const {hands,saved,toggleSaved}=usePoker();
 const base=hands.filter(h=>h.issue).sort((a,b)=>a.score-b.score);
 const {filtered:rows,panel}=useHandFilters(base,saved);
 return <main>
  <div className="page-heading compact"><div><span className="eyebrow">REVIEW QUEUE</span><h1>改善ハンド</h1><p>判断のズレが大きい順に並んでいます</p></div></div>
  {panel}
  <div className="review-summary"><div><strong>{rows.length}</strong><span>表示中</span></div><div><strong>{saved.length}</strong><span>保存済み</span></div><p>まずはスコアの低いハンドから。<br/>一度に3件だけ見直すのがおすすめです。</p></div>
  <section className="hand-list">{rows.map((h,i)=><article className="hand-card" key={h.id}><div className="hand-rank">{String(i+1).padStart(2,"0")}</div><div className="cards">{h.holeCards.map(c=><span key={c} className={/[♥♦]/.test(c)?"red":""}>{c}</span>)}</div><div className="hand-info"><div><b>{h.issue}</b><span className="tag">{h.position}</span></div><small>{h.playedAt} ・ {h.stakes}</small><p>{h.explanation}</p></div><div className="score"><span>DECISION SCORE</span><strong>{h.score}</strong><i style={{"--score":`${h.score}%`} as React.CSSProperties}/></div><button className={saved.includes(h.id)?"save active":"save"} onClick={()=>toggleSaved(h.id)} aria-label="復習リストに保存"><Bookmark size={19} fill={saved.includes(h.id)?"currentColor":"none"}/></button><Link href={`/hands/${h.id}`} className="detail-link">詳細を見る<ChevronRight size={18}/></Link></article>)}</section>
 </main>
}
