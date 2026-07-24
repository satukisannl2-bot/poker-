"use client";

import { Position } from "@/lib/types";

const ranks = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
const values:Record<string,number>={A:14,K:13,Q:12,J:11,T:10,"9":9,"8":8,"7":7,"6":6,"5":5,"4":4,"3":3,"2":2};
const targets:Partial<Record<Position,number>>={UTG:16,"UTG+1":18,MP:21,"MP+1":23,HJ:27,CO:34,BTN:49,SB:46,BB:35};

function notation(row:number,col:number){
 const a=ranks[row],b=ranks[col];
 if(row===col)return `${a}${b}`;
 return row<col?`${a}${b}s`:`${b}${a}o`;
}

function comboScore(row:number,col:number){
 const a=values[ranks[row]],b=values[ranks[col]],high=Math.max(a,b),low=Math.min(a,b),pair=row===col,suited=row<col,gap=high-low;
 if(pair)return 70+high*5;
 return high*5+low*2+(suited?9:0)+(gap===1?7:gap===2?3:0)+(high===14?8:0);
}

function selectedNotation(cards:string[]){
 if(cards.length<2)return "";
 const rank=(card:string)=>card.toUpperCase().replace("10","T").match(/[2-9TJQKA]/)?.[0]??"2";
 const suit=(card:string)=>card.slice(-1);
 const a=rank(cards[0]),b=rank(cards[1]);
 if(a===b)return `${a}${b}`;
 const high=values[a]>=values[b]?a:b,low=high===a?b:a;
 return `${high}${low}${suit(cards[0])===suit(cards[1])?"s":"o"}`;
}

export function PreflopRangeGrid({position,tableSize,holeCards,facing="unopened"}:{position:Position;tableSize:number;holeCards:string[];facing?:"unopened"|"limp"|"raise"|"reraise"}){
 const shortBoost=Math.max(0,6-tableSize)*3,base=(targets[position]??25)+shortBoost;
 const multiplier={unopened:1,limp:1.08,raise:.48,reraise:.24}[facing],target=Math.min(72,Math.max(4,Math.round(base*multiplier)));
 const cells=ranks.flatMap((_,row)=>ranks.map((__,col)=>({row,col,name:notation(row,col),score:comboScore(row,col)})));
 const sorted=[...cells].sort((a,b)=>b.score-a.score),playCount=Math.round(169*target/100),raiseCut=Math.round(playCount*.72),callCut=Math.round(playCount*.9);
 const tier=new Map(sorted.map((cell,index)=>[cell.name,index<raiseCut?"raise":index<callCut?"mix":index<playCount?"call":"fold"]));
 const selected=selectedNotation(holeCards);
 return <section className="range-grid-card">
  <div className="range-grid-title"><div><b>{position}・{tableSize}人卓</b><span>{({unopened:"未オープン",limp:"リンプあり",raise:"先行レイズあり",reraise:"リレイズあり"} as const)[facing]}の基準レンジ</span></div><strong>参加目安 {target}%</strong></div>
  <div className="range-grid" aria-label={`${position}のプリフロップ基準レンジ`}>
   {cells.map(cell=><span key={cell.name} title={`${cell.name}・${tier.get(cell.name)}`} className={`${tier.get(cell.name)} ${selected===cell.name?"selected":""}`}>{cell.name}</span>)}
  </div>
  <div className="range-legend"><span><i className="raise"/>レイズ中心</span><span><i className="mix"/>ミックス</span><span><i className="call"/>コール候補</span><span><i className="fold"/>フォールド</span></div>
  <p>枠線は今回のYOUのハンドです。人数・ポジション・YOUより前のアクションに応じて切り替わります。</p>
  <style jsx>{`
   .range-grid-card{margin-top:18px;padding-top:16px;border-top:1px solid #e4dfd5}.range-grid-title{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.range-grid-title div{display:grid;gap:2px}.range-grid-title b{font-size:12px}.range-grid-title span{font-size:9px;color:#7f8984}.range-grid-title strong{font-size:9px;color:#1e6656}.range-grid{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:2px}.range-grid span{aspect-ratio:1.15;display:grid;place-items:center;border-radius:2px;font-size:7px;font-weight:700;color:#34403c;background:#e2e2df;min-width:0}.range-grid .raise{background:#c95f4a;color:#fff}.range-grid .mix{background:#e2ae50;color:#26352f}.range-grid .call{background:#4c9680;color:#fff}.range-grid .fold{background:#dededb;color:#747b77}.range-grid .selected{outline:3px solid #8d3ad1;outline-offset:1px;z-index:2}.range-legend{display:flex;flex-wrap:wrap;gap:8px 11px;margin-top:10px}.range-legend span{display:flex;align-items:center;gap:4px;font-size:8px;color:#66716c}.range-legend i{width:9px;height:9px;border-radius:2px}.range-legend .raise{background:#c95f4a}.range-legend .mix{background:#e2ae50}.range-legend .call{background:#4c9680}.range-legend .fold{background:#dededb}.range-grid-card p{font-size:9px;line-height:1.6;color:#89918d;margin:9px 0 0}
  `}</style>
 </section>
}
