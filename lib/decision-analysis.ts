import { simpleStrength } from "./practice-game";

const ranks=["A","K","Q","J","T","9","8","7","6","5","4","3","2"],suits=["♠","♥","♦","♣"];
const rankValue:Record<string,number>={A:14,K:13,Q:12,J:11,T:10,"9":9,"8":8,"7":7,"6":6,"5":5,"4":4,"3":3,"2":2};

export type OpponentModel={fold:number;call:number;raise:number};
export type DecisionEstimate={
 equity:number; confidence:"medium"|"low"; madeHand:string; draws:string[]; boardTexture:string[];
 actionEv:{fold:number;call:number;raise:number}; frequencies:{fold:number;call:number;raise:number};
 betSizes:{label:string;chips:number;potPercent:number;estimatedEv:number}[];
 rangeComparison:{you:number;opponents:number}; sampleCount:number;
};

const categoryName=["ハイカード","ワンペア","ツーペア","スリーカード","ストレート","フラッシュ","フルハウス","フォーカード","ストレートフラッシュ"];
const category=(cards:string[])=>Math.floor(simpleStrength(cards)/1e10);
const hash=(text:string)=>[...text].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,2166136261);
const rng=(seed:number)=>()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const round=(n:number,digits=1)=>Number(n.toFixed(digits));

export function describeCards(hole:string[],board:string[]){
 const all=[...hole,...board],madeHand=categoryName[category(all)]??"未判定",draws:string[]=[],texture:string[]=[];
 const suitCounts=new Map<string,number>();all.forEach(card=>suitCounts.set(card.slice(-1),(suitCounts.get(card.slice(-1))??0)+1));
 const maxSuit=Math.max(0,...suitCounts.values()),boardSuits=new Map<string,number>();board.forEach(card=>boardSuits.set(card.slice(-1),(boardSuits.get(card.slice(-1))??0)+1));
 if(maxSuit===4)draws.push("フラッシュドロー");else if(maxSuit===3)draws.push("バックドアフラッシュ");
 const unique=[...new Set(all.map(c=>rankValue[c[0]]) )].sort((a,b)=>a-b);if(unique.includes(14))unique.unshift(1);
 let open=false,gut=false;for(let start=1;start<=10;start++){const hits=[start,start+1,start+2,start+3,start+4].filter(v=>unique.includes(v)).length;if(hits===4){if(!unique.includes(start)||!unique.includes(start+4))open=true;else gut=true}}
 if(open)draws.push("ストレートドロー");else if(gut)draws.push("ガットショット");
 if(Math.max(0,...boardSuits.values())>=3)texture.push("同じスートが3枚以上");
 const boardValues=board.map(c=>rankValue[c[0]]).sort((a,b)=>b-a);if(boardValues.some((v,i)=>i&&Math.abs(v-boardValues[i-1])<=2))texture.push("連結性が高い");
 if(new Set(boardValues).size<boardValues.length)texture.push("ペアボード");
 if(!texture.length)texture.push("比較的ドライ");
 return{madeHand,draws,boardTexture:texture};
}

export function estimateDecision(input:{
 hole:string[];board:string[];opponents:number;pot:number;toCall:number;stack:number;
 opponentModel?:OpponentModel;samples?:number;
}):DecisionEstimate{
 const samples=Math.max(100,input.samples??500),opponents=Math.max(1,input.opponents),known=new Set([...input.hole,...input.board]);
 const deck=ranks.flatMap(rank=>suits.map(suit=>rank+suit)).filter(card=>!known.has(card)),random=rng(hash([...known].join("|")+opponents));
 let wins=0,ties=0;
 for(let sample=0;sample<samples;sample++){
  const pool=[...deck];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  const missing=Math.max(0,5-input.board.length),runout=pool.splice(0,missing),fullBoard=[...input.board,...runout],heroScore=simpleStrength([...input.hole,...fullBoard]);
  const villainScores:number[]=[];for(let i=0;i<opponents;i++)villainScores.push(simpleStrength([pool.pop()!,pool.pop()!,...fullBoard]));
  const best=Math.max(heroScore,...villainScores);if(heroScore===best){const tied=1+villainScores.filter(score=>score===best).length;if(tied===1)wins++;else ties+=1/tied}
 }
 const equity=(wins+ties)/samples,model=input.opponentModel??{fold:.35,call:.55,raise:.10},foldEquity=Math.max(0,Math.min(.9,model.fold)),callEv=equity*(input.pot+input.toCall)-input.toCall;
 const baseRaise=Math.min(input.stack,Math.max(input.toCall*3,Math.round(input.pot*.66/50)*50,100));
 const raiseEv=foldEquity*input.pot+(1-foldEquity)*(equity*(input.pot+baseRaise+input.toCall)-baseRaise);
 const ev={fold:0,call:round(callEv),raise:round(raiseEv)},max=Math.max(ev.fold,ev.call,ev.raise),weights={fold:Math.exp((ev.fold-max)/Math.max(40,input.pot*.08)),call:Math.exp((ev.call-max)/Math.max(40,input.pot*.08)),raise:Math.exp((ev.raise-max)/Math.max(40,input.pot*.08))},weightTotal=weights.fold+weights.call+weights.raise;
 const frequencies={fold:Math.round(weights.fold/weightTotal*100),call:Math.round(weights.call/weightTotal*100),raise:0};frequencies.raise=100-frequencies.fold-frequencies.call;
 const betSizes=[.25,.33,.5,.75,1].map(percent=>{const chips=Math.min(input.stack,Math.max(50,Math.round(input.pot*percent/50)*50)),foldChance=Math.min(.85,foldEquity+percent*.12),estimatedEv=foldChance*input.pot+(1-foldChance)*(equity*(input.pot+chips)-chips);return{label:`${Math.round(percent*100)}% pot`,chips,potPercent:Math.round(percent*100),estimatedEv:round(estimatedEv)}});
 if(input.stack>0&&!betSizes.some(size=>size.chips===input.stack))betSizes.push({label:"All-in",chips:input.stack,potPercent:Math.round(input.stack/(input.pot||1)*100),estimatedEv:round(foldEquity*input.pot+(1-foldEquity)*(equity*(input.pot+input.stack)-input.stack))});
 betSizes.sort((a,b)=>b.estimatedEv-a.estimatedEv);
 return{equity:round(equity*100),confidence:opponents>1?"low":"medium",...describeCards(input.hole,input.board),actionEv:ev,frequencies,betSizes,rangeComparison:{you:round(equity*100),opponents:round((1-equity)*100)},sampleCount:samples};
}
