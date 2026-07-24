import { Hand, HandAction, Position } from "./types";
import { calculatePot, validateHoldemActions } from "./poker-rules";
const seats:Position[]=["UTG","UTG+1","MP","HJ","CO","BTN","SB","BB"];
const postOrder:Position[]=["SB","BB","UTG","UTG+1","MP","HJ","CO","BTN"];
const cards=[["A♠","K♠"],["Q♥","Q♣"],["J♦","T♦"],["8♠","8♥"],["A♣","J♣"],["K♥","Q♦"],["7♣","6♣"],["A♦","Q♠"]];
const boards=[["Q♠","7♦","2♣","T♠","4♥"],["9♣","6♥","3♠","2♦","K♣"],["J♣","8♦","3♥","K♠","2♣"],["8♦","5♣","2♠","A♥","5♦"],["A♥","T♣","4♦","7♠","2♥"],["K♣","9♦","3♣","6♥","J♠"],["9♣","8♥","2♦","5♠","K♦"],["Q♣","7♠","4♥","2♣","A♥"]];
const paidTo=(p:Position,target:number)=>target-(p==="SB"?50:p==="BB"?100:0);
const act=(street:HandAction["street"],player:string,type:HandAction["type"],amount?:number,toAmount?:number):HandAction=>({street,player,type,...(amount?{amount}:{}),...(toAmount?{toAmount}:{})});

function preflop(heroPos:Position,index:number){
 const heroRaise=index%2===0; const target=heroPos==="UTG"?250:750; const actions:HandAction[]=[];
 for(const p of seats){
  const name=p===heroPos?"Hero":p;
  if(p==="UTG")actions.push(p===heroPos?act("preflop","Hero","raise",250,250):act("preflop","UTG","raise",250,250));
  else if(p===heroPos)actions.push(heroRaise?act("preflop","Hero","raise",paidTo(p,750),750):act("preflop","Hero","call",paidTo(p,250),250));
  else if(p==="BB"&&heroRaise)actions.push(act("preflop","BB","call",paidTo("BB",target),target));
  else actions.push(act("preflop",name,"fold"));
 }
 if(heroRaise&&heroPos!=="UTG")actions.push(act("preflop","UTG","fold"));
 const villain:Position=heroRaise?"BB":"UTG"; return {actions,villain};
}

function postflop(heroPos:Position,villain:Position,index:number){
 const heroOrder=postOrder.indexOf(heroPos), villainOrder=postOrder.indexOf(villain); const heroOop=heroOrder<villainOrder;
 const oop=heroOop?"Hero":villain, ip=heroOop?villain:"Hero"; const a:HandAction[]=[];
 if(index%3===0)a.push(act("flop",oop,"check"),act("flop",ip,"bet",380,380),act("flop",oop,"raise",1050,1050),act("flop",ip,"call",670,1050),act("turn",oop,"bet",1500,1500),act("turn",ip,"call",1500,1500),act("river",oop,"bet",2800,2800),act("river",ip,"fold"));
 else if(index%3===1)a.push(act("flop",oop,"bet",420,420),act("flop",ip,"raise",1200,1200),act("flop",oop,"call",780,1200),act("turn",oop,"check"),act("turn",ip,"bet",1600,1600),act("turn",oop,"call",1600,1600),act("river",oop,"check"),act("river",ip,"check"));
 else a.push(act("flop",oop,"check"),act("flop",ip,"bet",380,380),act("flop",oop,"call",380,380),act("turn",oop,"check"),act("turn",ip,"bet",900,900),act("turn",oop,"raise",2400,2400),act("turn",ip,"call",1500,2400),act("river",oop,"bet",3200,3200),act("river",ip,"fold"));
 return a;
}

export const demo8MaxHands:Hand[]=seats.map((position,index)=>{
 const pf=preflop(position,index); const actions=[...pf.actions,...postflop(position,pf.villain,index)]; const pot=calculatePot(actions,position);
 const ruleErrors=validateHoldemActions(actions,position);
 if(ruleErrors.length)throw new Error(`DEMO8-${index+1}: ${ruleErrors.join(", ")}`);
 const score=[94,88,62,97,79,91,45,85][index], actualAction=index%2===0?"Raise":"Call", good=score>=80;
 return {id:`DEMO8-${String(index+1).padStart(3,"0")}`,playedAt:`2026-07-20 ${20+Math.floor(index/4)}:${String(index%4*12+3).padStart(2,"0")}`,game:"8-Max NL Hold’em",stakes:"50 / 100",hero:"Hero",position,tableSize:8,seatPositions:seats,rangeSource:"8-max / 100BB GTO基準モデル",holeCards:cards[index],board:boards[index],pot,result:[1250,980,-750,3260,420,1740,-1100,860][index],actualAction,recommendation:actualAction==="Raise"?{fold:4,call:8,raise:88}:{fold:15,call:77,raise:8},score,issue:good?undefined:["","","MPでの参加レンジ","","COでの薄いコール","","SBでのコール過多",""][index]||undefined,explanation:good?`${position}からの${actualAction}は8人卓の基準レンジと一致しています。ポジション順とベットサイズも適正です。`:`${position}では相手のレンジを考慮し、コールとレイズの頻度を調整しましょう。`,actions};
});
