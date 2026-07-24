"use client";

import { useMemo, useState } from "react";
import { estimateDecision } from "@/lib/decision-analysis";

type Props={
 holeCards:string[]; board:string[]; street:string; position:string;
 opponents:number; activeNames:string[]; pot:number; toCall:number; stack:number;
 actualAction?:string;
};

const ja:Record<string,string>={fold:"フォールド",call:"コール／チェック",raise:"レイズ／ベット"};
const signed=(value:number)=>`${value>=0?"+":""}${value.toLocaleString()} chips`;

export function DecisionInsights(props:Props){
 const [foldRate,setFoldRate]=useState(35),[raiseRate,setRaiseRate]=useState(10);
 const callRate=Math.max(0,100-foldRate-raiseRate);
 const estimate=useMemo(()=>estimateDecision({
  hole:props.holeCards,board:props.board,opponents:props.opponents,pot:props.pot,
  toCall:props.toCall,stack:props.stack,opponentModel:{fold:foldRate/100,call:callRate/100,raise:raiseRate/100},samples:800,
 }),[props.holeCards,props.board,props.opponents,props.pot,props.toCall,props.stack,foldRate,callRate,raiseRate]);
 const entries=(Object.entries(estimate.frequencies) as [keyof typeof estimate.frequencies,number][]).sort((a,b)=>b[1]-a[1]);
 const best=entries[0],gap=best[1]-entries[1][1],closeness=gap<=10?"ほぼ同じ":gap<=25?"やや優勢":"明確";
 const actual=(props.actualAction??"").toLowerCase().replace("bet","raise").replace("check","call") as keyof typeof estimate.actionEv;
 const bestEv=Math.max(...Object.values(estimate.actionEv)),loss=actual in estimate.actionEv?Math.max(0,bestEv-estimate.actionEv[actual]):undefined;
 return <section className="decision-insights">
  <div className="spot-summary"><b>{props.street}・YOU（{props.position}）</b><span>{props.opponents+1}人参加中</span><span>Pot {props.pot.toLocaleString()}</span><span>{props.toCall?`Call ${props.toCall.toLocaleString()}`:"YOUへのベットなし"}</span></div>
  <div className={`decision-result ${closeness==="ほぼ同じ"?"close":""}`}><small>{closeness==="ほぼ同じ"?"どちらも選べる場面":"第一候補"}</small><strong>{ja[best[0]]} {best[1]}%</strong><span>2番手との差 {gap}pt</span></div>
  <div className="ev-table">
   {(["fold","call","raise"] as const).map(action=><div key={action}><span>{ja[action]}</span><i><b style={{width:`${estimate.frequencies[action]}%`}}/></i><strong>{estimate.frequencies[action]}%</strong><em>推定EV {signed(estimate.actionEv[action])}</em></div>)}
  </div>
  {loss!==undefined&&<div className="ev-loss"><span>選択アクションの推定EV損失</span><strong>{loss.toLocaleString()} chips</strong><small>最高推定EVとの差。0なら候補内です。</small></div>}
  <div className="evidence-grid">
   <div><small>完成役</small><b>{estimate.madeHand}</b></div>
   <div><small>ドロー</small><b>{estimate.draws.join("・")||"目立つドローなし"}</b></div>
   <div><small>ボード</small><b>{estimate.boardTexture.join("・")}</b></div>
  </div>
  <div className="range-compare"><div><span>YOUの推定エクイティ</span><b>{estimate.rangeComparison.you}%</b></div><i><b style={{width:`${estimate.rangeComparison.you}%`}}/></i><small>相手レンジ合計 {estimate.rangeComparison.opponents}%・{estimate.sampleCount}回試行</small></div>
  <div className="size-options"><b>ベット／レイズ額の候補</b>{estimate.betSizes.slice(0,3).map((size,index)=><div key={`${size.label}-${size.chips}`}><strong>{index+1}</strong><span>{size.label}・{size.chips.toLocaleString()} chips</span><em>推定EV {signed(size.estimatedEv)}</em></div>)}</div>
  <details className="node-lock"><summary>相手の傾向を調整（簡易ノードロック）</summary>
   <label>フォールド傾向 <b>{foldRate}%</b><input type="range" min="0" max={Math.max(0,90-raiseRate)} value={foldRate} onChange={e=>setFoldRate(Number(e.target.value))}/></label>
   <label>レイズ傾向 <b>{raiseRate}%</b><input type="range" min="0" max={Math.max(0,90-foldRate)} value={raiseRate} onChange={e=>setRaiseRate(Number(e.target.value))}/></label>
   <p>コール傾向 {callRate}%として再計算します。</p>
  </details>
  <p className="estimate-warning">これはローカル計算による学習用の推定値です。{estimate.confidence==="low"?"マルチウェイは不確実性が高いため参考値として確認してください。":"本格GTOソルバーの厳密解ではありません。"}</p>
  <style jsx>{`
   .decision-insights{display:grid;gap:14px}.spot-summary{display:flex;flex-wrap:wrap;gap:6px}.spot-summary>*{font-size:9px;padding:5px 7px;border-radius:5px;background:#f1f3ef}.spot-summary b{background:#154c40;color:#fff}.decision-result{padding:13px;border-radius:9px;background:#edf5f1;display:grid;gap:3px}.decision-result.close{background:#fff5df}.decision-result small{font-size:9px;color:#68736e}.decision-result strong{font-size:20px;color:#195f50}.decision-result span{font-size:9px}.ev-table{display:grid;gap:10px}.ev-table>div{display:grid;grid-template-columns:80px 1fr 34px;gap:7px;align-items:center}.ev-table span,.ev-table strong{font-size:10px}.ev-table strong{text-align:right}.ev-table i,.range-compare>i{height:7px;border-radius:6px;background:#e8e6df;overflow:hidden}.ev-table i b,.range-compare>i b{height:100%;display:block;background:#d66f4a}.ev-table em{grid-column:2/4;text-align:right;font-size:8px;color:#718079}.ev-loss{border:1px solid #ead7ca;border-radius:8px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:3px}.ev-loss span,.ev-loss small{font-size:9px}.ev-loss strong{color:#bc5338}.ev-loss small{grid-column:1/3;color:#7a847f}.evidence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.evidence-grid>div{padding:9px 7px;border-radius:7px;background:#f5f4ef;display:grid;gap:3px}.evidence-grid small{font-size:8px;color:#7c8580}.evidence-grid b{font-size:9px;line-height:1.5}.range-compare{display:grid;gap:6px}.range-compare div{display:flex;justify-content:space-between;font-size:10px}.range-compare small{font-size:8px;color:#7d8681}.size-options{display:grid;gap:6px}.size-options>b{font-size:11px}.size-options>div{display:grid;grid-template-columns:20px 1fr auto;align-items:center;padding:7px;background:#f7f5ef;border-radius:6px}.size-options strong{width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#1e6656;color:#fff;font-size:8px}.size-options span,.size-options em{font-size:8px}.node-lock{border-top:1px solid #e3dfd5;padding-top:12px}.node-lock summary{font-size:10px;font-weight:700;cursor:pointer}.node-lock label{display:grid;grid-template-columns:1fr auto;gap:5px;margin-top:10px;font-size:9px}.node-lock input{grid-column:1/3;width:100%}.node-lock p,.estimate-warning{font-size:8px;line-height:1.6;color:#7b8580;margin:5px 0}.estimate-warning{padding:8px;background:#f4f1e9;border-radius:6px}
  `}</style>
 </section>
}
