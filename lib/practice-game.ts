import { Position } from "./types";
import { positionsForTable } from "./gto-ranges";

export type PracticeDeal={positions:Position[];heroPosition:Position;heroCards:string[];botCards:Record<string,string[]>;board:string[]};
const ranks=["A","K","Q","J","T","9","8","7","6","5","4","3","2"],suits=["♠","♥","♦","♣"];
export function createPracticeDeal(size:number,handNo:number):PracticeDeal{
 const deck=ranks.flatMap(r=>suits.map(s=>r+s));for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 const positions=positionsForTable(size),heroPosition=positions[(handNo-1)%positions.length],heroCards=[deck.pop()!,deck.pop()!],botCards:Record<string,string[]>={};
 positions.filter(p=>p!==heroPosition).forEach(p=>botCards[p]=[deck.pop()!,deck.pop()!]);return{positions,heroPosition,heroCards,botCards,board:[deck.pop()!,deck.pop()!,deck.pop()!,deck.pop()!,deck.pop()!]};
}
const rv:Record<string,number>={A:14,K:13,Q:12,J:11,T:10,"9":9,"8":8,"7":7,"6":6,"5":5,"4":4,"3":3,"2":2};
const encode=(category:number,kickers:number[])=>category*1e10+kickers.reduce((score,value,index)=>score+value*Math.pow(15,4-index),0);
export function evaluateFive(cards:string[]){
 const values=cards.map(c=>rv[c[0]]).sort((a,b)=>b-a),suits=cards.map(c=>c.slice(1)),counts=new Map<number,number>();
 values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
 const groups=[...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),unique=[...new Set(values)],wheel=unique.includes(14)&&[5,4,3,2].every(v=>unique.includes(v));
 let straightHigh=wheel?5:0;for(let i=0;i<=unique.length-5;i++)if(unique[i]-unique[i+4]===4)straightHigh=Math.max(straightHigh,unique[i]);
 const flush=suits.every(s=>s===suits[0]);
 if(flush&&straightHigh)return encode(8,[straightHigh]);
 if(groups[0][1]===4)return encode(7,[groups[0][0],groups.find(g=>g[1]===1)![0]]);
 if(groups[0][1]===3&&groups[1]?.[1]===2)return encode(6,[groups[0][0],groups[1][0]]);
 if(flush)return encode(5,values);
 if(straightHigh)return encode(4,[straightHigh]);
 if(groups[0][1]===3)return encode(3,[groups[0][0],...groups.filter(g=>g[1]===1).map(g=>g[0])]);
 const pairs=groups.filter(g=>g[1]===2).map(g=>g[0]).sort((a,b)=>b-a);
 if(pairs.length>=2)return encode(2,[pairs[0],pairs[1],groups.find(g=>g[1]===1)![0]]);
 if(pairs.length===1)return encode(1,[pairs[0],...groups.filter(g=>g[1]===1).map(g=>g[0]).sort((a,b)=>b-a)]);
 return encode(0,values);
}
export function simpleStrength(cards:string[]){
 if(cards.length<5){const values=cards.map(c=>rv[c[0]]).sort((a,b)=>b-a),pair=values[0]===values[1];return(pair?200:0)+(values[0]||0)*5+(values[1]||0)}
 let best=0;const choose=(start:number,picked:string[])=>{if(picked.length===5){best=Math.max(best,evaluateFive(picked));return}for(let i=start;i<=cards.length-(5-picked.length);i++)choose(i+1,[...picked,cards[i]])};choose(0,[]);return best;
}

export function compareHoldemHands(hands: Record<string,string[]>, board:string[]) {
 const scored=Object.entries(hands).map(([player,holeCards])=>({player,score:simpleStrength([...holeCards,...board])}));
 const best=Math.max(...scored.map(row=>row.score));
 return scored.filter(row=>row.score===best).map(row=>row.player);
}

export function botPreflopAction(cards:string[],position:string,currentBet:number,blind=0){
 const a=rv[cards[0][0]],b=rv[cards[1][0]],high=Math.max(a,b),low=Math.min(a,b),pair=a===b,suited=cards[0].slice(1)===cards[1].slice(1),gap=high-low;
 const late=["CO","BTN","SB","BB"].includes(position),premium=pair&&high>=11||high===14&&low>=12,strong=pair&&high>=8||high>=12&&low>=10||suited&&high>=11&&low>=9,playable=pair||high>=11&&low>=8||suited&&gap<=2&&high>=9||late&&high>=10;
 const roll=Math.random();
 if(currentBet>=300){
  if(premium&&roll<.72)return{type:"raise" as const,toAmount:Math.min(10000,currentBet*3)};
  if(strong&&roll<.58)return{type:"call" as const,toAmount:currentBet};
  return{type:"fold" as const,toAmount:0};
 }
 if(currentBet>100){
  if(premium&&roll<.68)return{type:"raise" as const,toAmount:Math.min(10000,currentBet*3)};
  if(strong&&roll<.62)return{type:"call" as const,toAmount:currentBet};
  return{type:"fold" as const,toAmount:0};
 }
 if(premium||strong&&roll<.55||late&&playable&&roll<.34)return{type:"raise" as const,toAmount:300};
 if(playable&&roll<.62)return{type:"call" as const,toAmount:100};
 if(position==="BB"&&currentBet<=100)return{type:"check" as const,toAmount:100};
 return{type:"fold" as const,toAmount:0};
}
