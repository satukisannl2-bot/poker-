"use client";

import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Hand } from "@/lib/types";

export type HandSource = "game" | "file";

export function getHandSource(hand: Hand): HandSource {
  return hand.id.startsWith("PRACTICE-") || /Practice/i.test(hand.game) ? "game" : "file";
}

export function HandSourceBadge({ hand }: { hand: Hand }) {
  const source = getHandSource(hand);
  return <span className={`hand-source-badge ${source}`}>{source === "game" ? "ゲーム" : "ファイル"}</span>;
}

export function useHandFilters(hands: Hand[], saved: string[]) {
  const [source, setSource] = useState("all");
  const [position, setPosition] = useState("all");
  const [street, setStreet] = useState("all");
  const [action, setAction] = useState("all");
  const [tableSize, setTableSize] = useState("all");
  const [score, setScore] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const filtered = hands.filter(hand =>
    (source === "all" || getHandSource(hand) === source) &&
    (position === "all" || hand.position === position) &&
    (street === "all" || hand.actions.some(a => a.player === hand.hero && a.street === street)) &&
    (action === "all" || hand.actualAction.toLowerCase() === action) &&
    (tableSize === "all" || hand.tableSize === Number(tableSize)) &&
    (score === "all" || score === "low" && hand.score < 60 || score === "mid" && hand.score >= 60 && hand.score < 80 || score === "high" && hand.score >= 80) &&
    (!savedOnly || saved.includes(hand.id))
  );
  const reset = () => {
    setSource("all"); setPosition("all"); setStreet("all"); setAction("all");
    setTableSize("all"); setScore("all"); setSavedOnly(false);
  };
  const panel = <section className="hand-filter-panel">
    <div className="filter-title"><SlidersHorizontal size={17}/><b>絞り込み</b><span>{filtered.length}件を表示</span></div>
    <label>データ種別<select value={source} onChange={e => setSource(e.target.value)}><option value="all">すべて</option><option value="game">ゲーム</option><option value="file">ファイル</option></select></label>
    <label>ポジション<select value={position} onChange={e => setPosition(e.target.value)}><option value="all">すべて</option>{["UTG","UTG+1","MP","MP+1","HJ","CO","BTN","SB","BB"].map(v => <option key={v}>{v}</option>)}</select></label>
    <label>ストリート<select value={street} onChange={e => setStreet(e.target.value)}><option value="all">すべて</option><option value="preflop">プリフロップ</option><option value="flop">フロップ</option><option value="turn">ターン</option><option value="river">リバー</option></select></label>
    <label>アクション<select value={action} onChange={e => setAction(e.target.value)}><option value="all">すべて</option><option value="fold">Fold</option><option value="call">Call</option><option value="raise">Raise</option></select></label>
    <label>テーブル人数<select value={tableSize} onChange={e => setTableSize(e.target.value)}><option value="all">すべて</option>{[2,3,4,5,6,7,8,9].map(v => <option key={v} value={v}>{v}人卓</option>)}</select></label>
    <label>判断スコア<select value={score} onChange={e => setScore(e.target.value)}><option value="all">すべて</option><option value="low">0〜59</option><option value="mid">60〜79</option><option value="high">80〜100</option></select></label>
    <label className="saved-filter"><input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)}/>保存済みのみ</label>
    <button type="button" onClick={reset}><RotateCcw size={14}/>リセット</button>
    <style jsx global>{`
      .hand-filter-panel{display:grid;grid-template-columns:1.25fr repeat(6,1fr) auto auto;gap:10px;align-items:end;background:var(--paper);border:1px solid var(--line);border-radius:11px;padding:16px;margin-bottom:20px}
      .filter-title{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:center;color:var(--green)}.filter-title span{grid-column:2;font-size:9px;color:#8a928e}
      .hand-filter-panel label{display:grid;gap:5px;font-size:9px;color:#7a827e}.hand-filter-panel select{min-width:0;border:1px solid var(--line);border-radius:7px;background:white;padding:9px;color:var(--ink)}
      .hand-filter-panel .saved-filter{display:flex;align-items:center;gap:6px;padding:9px 0;font-size:10px;white-space:nowrap}.hand-filter-panel button{display:flex;align-items:center;gap:5px;border:1px solid var(--line);background:white;border-radius:7px;padding:9px;color:#65706b;cursor:pointer}
      .hand-source-badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;font-size:8px;font-weight:700;letter-spacing:.04em;margin-left:6px}.hand-source-badge.game{background:#dcefe8;color:#176351}.hand-source-badge.file{background:#e8edf5;color:#49637d}
      @media(max-width:1100px){.hand-filter-panel{grid-template-columns:repeat(4,1fr)}.filter-title{grid-column:1/-1}}@media(max-width:600px){.hand-filter-panel{grid-template-columns:repeat(2,1fr)}}
    `}</style>
  </section>;
  return { filtered, panel };
}
