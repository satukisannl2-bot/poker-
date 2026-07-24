import { Hand, PositionStat, Stats } from "./types";
const round=(n:number)=>Math.round(n*10)/10;
const ratio=(n:number,d:number)=>d?round(n/d*100):0;

export function calculateStats(hands:Hand[]):Stats{
 let vpip=0,pfr=0,threeBet=0,cbetOpp=0,cbetMade=0,foldCbetOpp=0,foldCbet=0;
 for(const h of hands){
  const pre=h.actions.filter(a=>a.street==="preflop"); const heroPre=pre.filter(a=>a.player===h.hero); const raises=pre.filter(a=>a.type==="raise");
  if(heroPre.some(a=>a.type==="call"||a.type==="raise"))vpip++;
  if(heroPre.some(a=>a.type==="raise"))pfr++;
  if(pre.some((a,i)=>a.player===h.hero&&a.type==="raise"&&pre.slice(0,i).some(x=>x.type==="raise")))threeBet++;
  const lastRaiser=raises[raises.length-1]?.player; const flop=h.actions.filter(a=>a.street==="flop");
  if(lastRaiser===h.hero&&flop.length){cbetOpp++;const heroIndex=flop.findIndex(a=>a.player===h.hero&&a.type!=="check");if(heroIndex>=0&&(flop[heroIndex].type==="bet"||flop[heroIndex].type==="raise")&&!flop.slice(0,heroIndex).some(a=>a.type==="bet"||a.type==="raise"))cbetMade++;}
  else if(lastRaiser){const aggressorBet=flop.findIndex(a=>a.player===lastRaiser&&a.type==="bet");if(aggressorBet>=0){const heroResponse=flop.slice(aggressorBet+1).find(a=>a.player===h.hero);if(heroResponse){foldCbetOpp++;if(heroResponse.type==="fold")foldCbet++;}}}
 }
 return {hands:hands.length,vpip:ratio(vpip,hands.length),pfr:ratio(pfr,hands.length),threeBet:ratio(threeBet,hands.length),cbet:ratio(cbetMade,cbetOpp),foldToCbet:ratio(foldCbet,foldCbetOpp),net:hands.reduce((s,h)=>s+h.result,0)};
}
export function calculatePositions(hands:Hand[]):PositionStat[]{
 const order=(['UTG','UTG+1','MP','MP+1','HJ','CO','BTN','SB','BB'] as const); const present=new Set(hands.flatMap(h=>h.seatPositions??[h.position]));
 return order.filter(position=>present.has(position)).map(position=>{const rows=hands.filter(h=>h.position===position),stats=calculateStats(rows);return {position,hands:rows.length,bb100:rows.length?round(rows.reduce((s,h)=>s+h.result,0)/100/rows.length*100):0,vpip:stats.vpip,pfr:stats.pfr};});
}
