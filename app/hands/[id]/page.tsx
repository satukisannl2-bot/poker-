"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, Lightbulb, RotateCcw, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { usePoker } from "@/components/poker-provider";
import { PreflopRangeGrid } from "@/components/preflop-range-grid";
import { DecisionInsights } from "@/components/decision-insights";
import { ActionType, Hand, Position } from "@/lib/types";
import { calculatePot } from "@/lib/poker-rules";
import { getPreflopGtoBaseline, positionsForTable } from "@/lib/gto-ranges";

const slotSets:Record<number,string[]>={1:["top"],2:["left-top","right-top"],3:["left-top","top","right-top"],4:["left-bottom","left-top","right-top","right-bottom"],5:["left-bottom","left-top","top","right-top","right-bottom"],6:["bottom-left","left-bottom","left-top","right-top","right-bottom","bottom-right"],7:["bottom-left","left-bottom","left-top","top","right-top","right-bottom","bottom-right"],8:["bottom-left","left-bottom","left-top","top","right-top","right-middle","right-bottom","bottom-right"]};
const opponentSeats=(all:Position[],hero:Position)=>{const heroIndex=all.indexOf(hero);const ordered=heroIndex>=0?[...all.slice(heroIndex+1),...all.slice(0,heroIndex)]:all;return ordered.filter(p=>p!==hero)};
const actionName:Record<ActionType,string>={fold:"フォールド",call:"コール",raise:"レイズ",check:"チェック",bet:"ベット"};
const streetName={preflop:"プリフロップ",flop:"フロップ",turn:"ターン",river:"リバー"};
const noYen=(value:string)=>value.replaceAll("¥","").replace(/\s*\/\s*/g," / ");
const shownAmount=(action:{amount?:number;toAmount?:number})=>action.toAmount??action.amount;
const actionAdvice=(hand:Hand,action:Hand["actions"][number]|undefined,actions:Hand["actions"],fallback:Hand["recommendation"])=>{
 if(!action)return {values:fallback,labels:["Fold","Call","Raise"],actual:undefined,note:"再生すると、各判断時点の推奨頻度へ切り替わります。"};
 const decisionIndex=actions.indexOf(action),allBefore=actions.slice(0,decisionIndex),before=allBefore.filter(a=>a.street===action.street);
 const folded=new Set(allBefore.filter(a=>a.type==="fold").map(a=>a.player)),tableSize=hand.tableSize??hand.seatPositions?.length??8;
 const participants=(hand.seatPositions??positionsForTable(tableSize)).map(position=>position===hand.position?hand.hero:position);
 const activeNames=participants.filter(player=>!folded.has(player)),activePlayers=Math.max(2,activeNames.length),activeLabel=activeNames.map(player=>player===hand.hero?`YOU（${hand.position}）`:player).join("・");
 const actual=action.type==="fold"?"Fold":action.type==="call"?"Call":action.type==="raise"?"Raise":action.type==="bet"?"Bet":"Check";
 if(action.street==="preflop"){
  const marker="__YOU_DECISION__",decisionActions=[...allBefore,{...action,player:marker}];
  const baseline=getPreflopGtoBaseline({cards:hand.holeCards,position:hand.position,tableSize:activePlayers,actions:decisionActions,hero:marker,effectiveStackBb:hand.strategyContext?.effectiveStackBb??100,anteBb:hand.strategyContext?.anteBb??0});
  const biggestRaise=Math.max(0,...before.filter(a=>a.type==="raise").map(a=>shownAmount(a)??0));
  return {values:baseline.recommendation,labels:["Fold","Call","Raise"],actual,note:`YOUが判断した時点では${activePlayers}人（${activeLabel}）が残っていました。対面レイズは${biggestRaise?`${biggestRaise.toLocaleString()} chips`:"なし"}です。`};
 }
 const contributions=new Map<string,number>();before.forEach(a=>contributions.set(a.player,(contributions.get(a.player)??0)+(a.amount??0)));
 const currentBet=Math.max(0,...contributions.values()),youPaid=contributions.get(hand.hero)??0,toCall=Math.max(0,currentBet-youPaid),potBefore=calculatePot(allBefore,hand.position);
 const facingBet=toCall>0,price=toCall/(potBefore+toCall||1),multiwayPenalty=Math.max(0,activePlayers-2)*4;
 if(!facingBet){
  const bet=Math.max(18,Math.min(72,48-(activePlayers-2)*5+(action.street==="river"?8:0))),check=100-bet;
  return {values:{fold:0,call:check,raise:bet},labels:["Fold","Check","Bet"],actual,note:`YOUが判断した時点では${activePlayers}人（${activeLabel}）が残り、YOUへのベットはありません。ポットは${potBefore.toLocaleString()} chipsです。`};
 }
 const raise=Math.max(4,Math.min(28,24-Math.round(price*35)-multiwayPenalty)),fold=Math.max(8,Math.min(88,Math.round(price*115)+multiwayPenalty)),call=Math.max(0,100-fold-raise),total=fold+call+raise;
 const values={fold:Math.round(fold/total*100),call:Math.round(call/total*100),raise:0};values.raise=100-values.fold-values.call;
 return {values,labels:["Fold","Call","Raise"],actual,note:`YOUが判断した時点では${activePlayers}人（${activeLabel}）が残り、コールには${toCall.toLocaleString()} chips必要でした。ポットは${potBefore.toLocaleString()} chips、必要勝率は約${Math.round(price*100)}%です。`};
};
const completePreflopActions=(hand:Hand)=>{
 const preflop=hand.actions.filter(a=>a.street==="preflop"); if(!preflop.length)return hand.actions;
 const seats=hand.seatPositions??positionsForTable(hand.tableSize??8); const used=new Set<number>(); const firstRound:Hand["actions"]=[];
 const recognizedPlayers=new Set<string>([hand.hero,...seats]);
 if(preflop.some(action=>!recognizedPlayers.has(action.player)))return hand.actions;
 for(const position of seats){const player=position===hand.position?hand.hero:position;const index=preflop.findIndex((a,i)=>!used.has(i)&&a.player===player);if(index>=0){firstRound.push(preflop[index]);used.add(index)}else firstRound.push({street:"preflop",player,type:"fold"})}
 const remaining=preflop.filter((_,i)=>!used.has(i)); return [...firstRound,...remaining,...hand.actions.filter(a=>a.street!=="preflop")];
};
function ChipStack({amount,pot=false}:{amount:number;pot?:boolean}){return <div className={pot?"wager-chip pot-chips":"wager-chip"}><span className="chip-art"><i/><i/><i/></span>{!pot&&<b>{amount.toLocaleString()}</b>}</div>}

export default function HandDetail(){
 const {id}=useParams<{id:string}>(); const {hands,saved,toggleSaved}=usePoker(); const h=hands.find(x=>x.id===id)||hands[0];
 const replayActions=h?completePreflopActions(h):[]; const [step,setStep]=useState(0); const [playing,setPlaying]=useState(false);
 useEffect(()=>{setStep(0);setPlaying(false)},[id]);
 useEffect(()=>{if(!playing||!h)return;const timer=setInterval(()=>setStep(s=>{if(s>=replayActions.length){setPlaying(false);return s}return s+1}),900);return()=>clearInterval(timer)},[playing,h,replayActions.length]);
 if(!h)return null;
 const visibleActions=replayActions.slice(0,step); const current=step?replayActions[step-1]:undefined; const max=replayActions.length;
 const street=current?.street; const boardCount=street==="flop"?3:street==="turn"?4:street==="river"?5:0; const visibleBoard=h.board.slice(0,boardCount);
 const runningPot=calculatePot(visibleActions,h.position);
 const tableSize=h.tableSize??h.seatPositions?.length??8; const tablePositions=h.seatPositions??positionsForTable(tableSize); const opponents=opponentSeats(tablePositions,h.position); const slots=slotSets[opponents.length]??slotSets[7];
 const latestByPlayer=new Map<string,typeof current>(); visibleActions.forEach(a=>latestByPlayer.set(a.player,a));
 const heroDecision=[...visibleActions].reverse().find(a=>a.player===h.hero); const latestHeroVisibleIndex=heroDecision?visibleActions.lastIndexOf(heroDecision):-1;
 const awaitingYou=!heroDecision||visibleActions.slice(latestHeroVisibleIndex+1).some(a=>a.type==="bet"||a.type==="raise");
 const previewStreet=current?.street??"preflop",previewAction:Hand["actions"][number]={street:previewStreet,player:h.hero,type:"call"};
 const adviceActions=awaitingYou?[...visibleActions,previewAction]:replayActions,adviceDecision=awaitingYou?previewAction:heroDecision;
 const heroDecisionIndex=awaitingYou?step:heroDecision?replayActions.indexOf(heroDecision)+1:0;
 const advice=actionAdvice(h,adviceDecision,adviceActions,h.recommendation); const adviceValues=advice.values;
 const bestEntry=(Object.entries(adviceValues) as [keyof typeof adviceValues,number][]).sort((a,b)=>b[1]-a[1])[0];
 const actionJa={fold:"フォールド",call:advice.labels[1]==="Check"?"チェック":"コール",raise:advice.labels[2]==="Bet"?"ベット":"レイズ"};
 const bestActionJa=actionJa[bestEntry[0]],actualActionJa=awaitingYou?undefined:(advice.actual??h.actualAction);
 const snapshotIndex=adviceDecision?adviceActions.indexOf(adviceDecision):-1,snapshotActions=snapshotIndex>=0?adviceActions.slice(0,snapshotIndex):visibleActions;
 const snapshotFolded=new Set(snapshotActions.filter(a=>a.type==="fold").map(a=>a.player));
 const participantNames=tablePositions.map(position=>position===h.position?h.hero:position),activeNames=participantNames.filter(player=>!snapshotFolded.has(player));
 const snapshotStreet=adviceDecision?.street??previewStreet,snapshotBoardCount=snapshotStreet==="flop"?3:snapshotStreet==="turn"?4:snapshotStreet==="river"?5:0;
 const snapshotBoard=h.board.slice(0,snapshotBoardCount),streetBefore=snapshotActions.filter(a=>a.street===snapshotStreet);
 const streetPaid=new Map<string,number>();streetBefore.forEach(a=>streetPaid.set(a.player,(streetPaid.get(a.player)??0)+(a.amount??0)));
 const snapshotBet=Math.max(0,...streetPaid.values()),snapshotYouPaid=streetPaid.get(h.hero)??0,snapshotToCall=Math.max(0,snapshotBet-snapshotYouPaid);
 const preflopBefore=snapshotActions.filter(a=>a.street==="preflop"),raiseCount=preflopBefore.filter(a=>a.type==="raise").length;
 const rangeFacing: "unopened"|"limp"|"raise"|"reraise"=raiseCount>1?"reraise":raiseCount===1?"raise":preflopBefore.some(a=>a.type==="call")?"limp":"unopened";
 const wagerFor=(player:string)=>{if(!street)return 0;return visibleActions.filter(a=>a.street===street&&a.player===player).reduce((sum,a)=>sum+(a.amount||0),0)};
 const streets=(["preflop","flop","turn","river"] as const);
 return <main>
  <div className="detail-top"><Link href="/improvements"><ArrowLeft size={18}/>ハンド一覧へ</Link><button className={saved.includes(h.id)?"secondary-button saved":"secondary-button"} onClick={()=>toggleSaved(h.id)}><Bookmark size={17} fill={saved.includes(h.id)?"currentColor":"none"}/>{saved.includes(h.id)?"保存済み":"復習リストに保存"}</button></div>
  <div className="hand-title"><div><span className="eyebrow">HAND {h.id}</span><h1>{h.issue||"ハンドレビュー"}</h1><p>{h.playedAt} ・ {h.game} ・ {noYen(h.stakes)} ・ {h.position}</p></div><div className="decision-badge"><small>STRATEGY SCORE</small><strong>{h.score}<em>/100</em></strong></div></div>
  <div className="detail-grid"><section className="replayer">
   <div className="table eight-table">
    {opponents.map((p,i)=>{const a=latestByPlayer.get(p);const active=current?.player===p;const wager=wagerFor(p);const shown=a?shownAmount(a):undefined;return <div key={p} className={`seat seat-slot ${slots[i]} ${active?"acting":""}`}><div><b>{p}</b><span>{92+i*3} BB</span></div>{a&&<em className={`seat-action ${a.type}`}>{actionName[a.type]}{shown?` ${shown.toLocaleString()}`:""}</em>}{wager>0&&<ChipStack amount={wager}/>}</div>})}
    <div className="felt"><small>POT・CHIPS</small><strong>{runningPot.toLocaleString()}</strong><ChipStack amount={runningPot} pot/><div className="board">{visibleBoard.map((c,i)=>{const red=/[♥♦]/.test(c);return <i key={`${c}-${i}`} className={red?"red deal-card":"deal-card"} style={red?undefined:{color:"#172521"}}>{c}</i>})}{!visibleBoard.length&&<span className="waiting-board">PREFLOP</span>}</div></div>
    <div className={`hero-seat ${current?.player===h.hero?"acting":""}`}><small>YOU ・ {h.position}</small><div>{h.holeCards.map((c,i)=><i key={`${c}-${i}`} className={/[♥♦]/.test(c)?"red":""}>{c}</i>)}</div><b>98 BB</b>{latestByPlayer.get(h.hero)&&<em className={`seat-action hero-bubble ${latestByPlayer.get(h.hero)!.type}`}>{actionName[latestByPlayer.get(h.hero)!.type]}{shownAmount(latestByPlayer.get(h.hero)!)?` ${shownAmount(latestByPlayer.get(h.hero)!)!.toLocaleString()}`:""}</em>}{wagerFor(h.hero)>0&&<ChipStack amount={wagerFor(h.hero)}/>}</div>
   </div>
   <div className="replay-controls"><button aria-label="最初に戻る" onClick={()=>{setStep(0);setPlaying(false)}}><RotateCcw size={16}/></button><button aria-label="前のアクション" disabled={step===0} onClick={()=>{setStep(s=>Math.max(0,s-1));setPlaying(false)}}><SkipBack size={16}/></button><button className="play-button" aria-label={playing?"一時停止":"再生"} onClick={()=>{if(step>=max)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><button aria-label="次のアクション" disabled={step>=max} onClick={()=>{setStep(s=>Math.min(max,s+1));setPlaying(false)}}><SkipForward size={16}/></button><div className="timeline"><i style={{width:`${max?step/max*100:0}%`}}/></div><div className="current-action-label">{current?<><b>{current.player===h.hero?`YOU・${h.position}`:current.player}</b><span>{actionName[current.type]}{shownAmount(current)?` ${shownAmount(current)!.toLocaleString()} chips`:""}</span></>:<span>開始前</span>}</div><span>{step} / {max}</span></div>
   <div className="action-history"><div className="history-title"><b>アクション履歴</b><span>時系列順</span></div>{streets.map(street=>{const acts=replayActions.filter(a=>a.street===street);return acts.length?<section className="street-block" key={street}><div className="street-heading"><span>{streetName[street]}</span><i>{acts.length} actions</i></div><div className="action-rows">{acts.map((a,i)=><div className={a.player===h.hero?"action-row hero-action":"action-row"} key={i}><span className="action-number">{i+1}</span><b className="action-player">{a.player===h.hero?`YOU・${h.position}`:a.player}</b><span className={`action-badge ${a.type}`}>{actionName[a.type]}</span><strong className="action-amount">{shownAmount(a)?`${shownAmount(a)!.toLocaleString()} chips`:"—"}</strong></div>)}</div></section>:null})}</div>
  </section>
  <aside className="analysis-panel" key={heroDecisionIndex}><span className="eyebrow">{awaitingYou?`NEXT YOU DECISION / ${streetName[previewStreet]}`:`YOU・${h.position} / ${streetName[heroDecision!.street]}`}</span><h2>YOUの判断ガイド</h2>
   <DecisionInsights holeCards={h.holeCards} board={snapshotBoard} street={streetName[snapshotStreet]} position={h.position} opponents={Math.max(1,activeNames.length-1)} activeNames={activeNames.map(player=>player===h.hero?"YOU":player)} pot={calculatePot(snapshotActions,h.position)} toCall={snapshotToCall} stack={10000} actualAction={awaitingYou?undefined:advice.actual}/>
   <div className="range-note"><b>基準戦略の計算条件</b><p>{h.rangeSource??`${tableSize}人卓・100BB・アンティ0BBの基準戦略（簡易モデル）`}</p>{h.strategyContext&&<p>ポジション {h.strategyContext.position} ・ 先行アクション {h.strategyContext.facing} ・ 対面サイズ {h.strategyContext.facingSizeBb.toFixed(1)}BB</p>}<small>本格ソルバーの計算結果ではなく、学習用の参考値です。</small></div><PreflopRangeGrid position={h.position} tableSize={tableSize} holeCards={h.holeCards} facing={rangeFacing}/>
  </aside></div>
  <style jsx global>{`
   .eight-table{height:430px}.board i{color:#172521}.seat-slot{z-index:3;display:flex;gap:7px;align-items:center}.seat-slot b{font-size:9px}.seat-slot span{margin:0;font-size:8px}.seat-slot.top-left{top:27px;left:16%}.seat-slot.top{top:15px;left:45%}.seat-slot.top-right{top:27px;right:16%}.seat-slot.right-top{right:14px;top:35%}.seat-slot.right-bottom{right:14px;top:62%}.seat-slot.bottom-right{right:17%;bottom:20px}.seat-slot.bottom-left{left:17%;bottom:20px}.seat-slot.left{left:14px;top:48%}.eight-table .hero-seat{z-index:4;bottom:12px}.eight-table .felt{width:67%;height:52%}
   .action-history{padding:20px}.history-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.history-title b{font-size:13px}.history-title span{font-size:9px;color:#949b96}.street-block{display:grid;grid-template-columns:105px 1fr;border-top:1px solid #e7e3da;padding:13px 0}.street-heading{display:grid;align-content:start;gap:3px}.street-heading span{font-size:9px;color:#1e6656;font-weight:700;letter-spacing:.06em}.street-heading i{font-size:8px;color:#a0a5a1;font-style:normal}.action-rows{display:grid;gap:5px}.action-row{display:grid;grid-template-columns:22px 1fr 90px 90px;align-items:center;gap:8px;min-height:30px;border-radius:6px;padding:3px 8px;background:#faf9f5}.action-row.hero-action{background:#eaf3ef;border-left:3px solid #1e6656}.action-number{font-size:8px;color:#a1a6a2}.action-player{font-size:10px}.hero-action .action-player{color:#1e6656}.action-badge{width:max-content;border-radius:4px;padding:3px 7px;font-size:8px;font-weight:700}.action-badge.fold{background:#eee;color:#747b77}.action-badge.check{background:#e8eef2;color:#526e7a}.action-badge.call{background:#fff0d2;color:#8a641b}.action-badge.bet,.action-badge.raise{background:#f8dfd5;color:#a54d32}.action-amount{text-align:right;font-size:9px;color:#56615d}
   .clear-note{align-items:flex-start}.coach-steps{display:grid;gap:9px;margin-top:9px}.coach-steps p{margin:0!important;line-height:1.7}.coach-steps strong{display:inline-block;min-width:38px;margin-right:7px;padding:2px 6px;border-radius:4px;background:#dcece6;color:#176351;font-size:9px}
   @media(max-width:600px){.eight-table{height:350px}.seat-slot{padding:5px 7px}.seat-slot span{display:none}.seat-slot.bottom-left,.seat-slot.bottom-right{bottom:8px}.eight-table .hero-seat{bottom:48px}.eight-table .felt{width:78%;height:45%}.street-block{grid-template-columns:1fr}.street-heading{display:flex;justify-content:space-between;margin-bottom:7px}.action-row{grid-template-columns:18px 1fr 70px 70px}.action-history{padding:14px}}
  `}</style>
  <style jsx global>{`
   .deal-card{animation:dealIn .25s ease-out both}@keyframes dealIn{from{opacity:0;transform:translateY(-8px) scale(.9)}to{opacity:1;transform:none}}
   .waiting-board{border:1px dashed #ffffff55;border-radius:5px;padding:8px 18px;letter-spacing:.18em;color:#b8d0ca!important}
   .seat-slot{display:grid!important;justify-items:center;gap:5px!important;transition:.2s}.seat-slot>div{display:flex;gap:7px;align-items:center}.seat-slot.acting,.hero-seat.acting{filter:drop-shadow(0 0 8px #f0c66e);transform:scale(1.06)}
   .seat-action{position:absolute;top:34px;white-space:nowrap;border-radius:5px;padding:4px 7px;background:#f7f4eb;color:#283a35;font-size:8px;font-style:normal;font-weight:700;box-shadow:0 3px 8px #0003}.seat-action.fold{background:#d9dedb;color:#58625e}.seat-action.bet,.seat-action.raise{background:#f3cdbb;color:#8c3f28}.seat-action.call{background:#f3dfa9;color:#705617}.seat-action.check{background:#d8e7ec;color:#466571}.hero-bubble{top:auto;bottom:-28px;left:50%;transform:translateX(-50%)}
   .replay-controls button{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#1e6656}.replay-controls button:disabled{opacity:.3;cursor:not-allowed}.replay-controls .play-button{background:#1e6656;color:white}.current-action-label{display:grid;min-width:125px;gap:1px}.current-action-label b{font-size:8px;color:#1e6656}.current-action-label span{font-size:8px;color:#747c78}
   .seat-slot.bottom-left{left:18%;bottom:20px;top:auto;right:auto}.seat-slot.left-bottom{left:14px;top:63%;right:auto;bottom:auto}.seat-slot.left-top{left:14px;top:27%;right:auto;bottom:auto}.seat-slot.top{left:45%;top:15px;right:auto;bottom:auto}.seat-slot.right-top{right:14px;top:27%;left:auto;bottom:auto}.seat-slot.right-middle{right:14px;top:45%;left:auto;bottom:auto}.seat-slot.right-bottom{right:14px;top:63%;left:auto;bottom:auto}.seat-slot.bottom-right{right:18%;bottom:20px;left:auto;top:auto}
   .wager-chip{position:absolute;z-index:6;display:flex;align-items:center;gap:4px;color:#f7f2e7;animation:chipsIn .22s ease-out both}.wager-chip>b{font-size:8px;background:#0e2c26cc;padding:3px 5px;border-radius:8px}.chip-art{position:relative;width:21px;height:18px;display:block}.chip-art i{position:absolute;width:16px;height:6px;border-radius:50%;border:1.5px dashed #fff;background:#d85f4b;box-shadow:0 1px 1px #0004;left:2px}.chip-art i:nth-child(1){bottom:1px}.chip-art i:nth-child(2){bottom:5px;background:#e4b24e}.chip-art i:nth-child(3){bottom:9px;background:#477eaa}.pot-chips{position:relative;inset:auto;margin:3px 0 -3px}.pot-chips .chip-art{transform:scale(.9)}.seat-slot.top .wager-chip{top:42px}.seat-slot.left-top .wager-chip,.seat-slot.left-bottom .wager-chip{left:72px;top:7px}.seat-slot.right-top .wager-chip,.seat-slot.right-bottom .wager-chip{right:72px;top:7px;flex-direction:row-reverse}.seat-slot.bottom-left .wager-chip,.seat-slot.bottom-right .wager-chip{bottom:42px}.hero-seat>.wager-chip{top:-31px;left:50%;transform:translateX(-50%)}@keyframes chipsIn{from{opacity:0;scale:.6}to{opacity:1;scale:1}}
  `}</style>
  <style jsx global>{`
   .seat-slot.top .wager-chip{top:68px}
   .seat-slot.top .seat-action{top:36px}
   .seat-slot.top .wager-chip>b{margin-left:3px}
   @media(max-width:600px){.seat-slot.top .wager-chip{top:58px}}
  `}</style>
 </main>
}
