import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const outDir = path.dirname(fileURLToPath(import.meta.url));
let seed = 20260720;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const layouts = { 2:["SB","BB"],3:["BTN","SB","BB"],4:["CO","BTN","SB","BB"],5:["HJ","CO","BTN","SB","BB"],6:["UTG","HJ","CO","BTN","SB","BB"],7:["UTG","UTG+1","HJ","CO","BTN","SB","BB"] };
const postOrder=["SB","BB","UTG","UTG+1","MP","MP+1","HJ","CO","BTN"];
const ranks=["A","K","Q","J","T","9","8","7","6","5","4","3","2"], suits=["s","h","d","c"];
const headers=["Hand ID","Date","Tournament ID","Game Type","Table Size","Player Count","Position","Hero","Hole Cards","Flop","Turn","River","Board","Actions","Small Blind","Big Blind","Ante","Stakes","Pot","Result","All Players","GTO Model"];
const csvCell=v=>`"${String(v??"").replaceAll('"','""')}"`;
const act=(street,player,type,amount,toAmount)=>({street,player,type,...(amount?{amount}:{}),...(toAmount?{toAmount}:{})});

function deck(){const d=[];for(const r of ranks)for(const s of suits)d.push(r+s);for(let i=d.length-1;i;i--){const j=Math.floor(rnd()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d}
function paidTo(p,target,sb,bb){return target-(p==="SB"?sb:p==="BB"?bb:0)}
function blindLevel(hand){const level=Math.floor((hand-1)/50);const bb=Math.round(100*Math.pow(1.22,level)/10)*10;return {sb:Math.round(bb/2),bb,ante:level<2?0:Math.max(10,Math.round(bb*.12/10)*10)}}
function calculatePot(actions,heroPos,size,sb,bb,ante){let total=size*ante+sb+bb;for(const street of ["preflop","flop","turn","river"]){const rows=actions.filter(a=>a.street===street);total+=rows.reduce((s,a)=>s+(a.amount||0),0);if(rows.at(-1)?.type==="fold"){const paid=new Map();if(street==="preflop"){paid.set(heroPos==="SB"?"Hero":"SB",sb);paid.set(heroPos==="BB"?"Hero":"BB",bb)}for(const a of rows)paid.set(a.player,(paid.get(a.player)||0)+(a.amount||0));const levels=[...paid.values()].sort((a,b)=>b-a);if(levels.length>1)total-=Math.max(0,levels[0]-levels[1])}}return total}
const gtoForAction=(type,street,position,size)=>{const late=["CO","BTN","SB","BB"].includes(position),short=size<=4;let v=type==="fold"?{fold:72,call:19,raise:9}:type==="call"?{fold:18,call:66,raise:16}:type==="raise"?{fold:6,call:18,raise:76}:type==="check"?{fold:0,call:68,raise:32}:{fold:0,call:34,raise:66};if(street==="preflop"&&(late||short)){v={...v,raise:Math.min(90,v.raise+8),fold:Math.max(0,v.fold-8)}}return v};

function makeHand(n,size){
 const positions=layouts[size], heroPos=positions[(n-1)%positions.length], hero="Hero"; const {sb,bb,ante}=blindLevel(n); const d=deck(),hole=[d.pop(),d.pop()],board=[d.pop(),d.pop(),d.pop(),d.pop(),d.pop()];
 const order=positions, opener=order[0], villain=opener===heroPos?"BB":opener, mode=n%5; const actions=[]; let continues=true;
 const openTo=Math.round(bb*2.5), raiseTo=Math.round(bb*8);
 for(const p of order){const name=p===heroPos?hero:p;
  if(p===opener){actions.push(act("preflop",name,"raise",paidTo(p,openTo,sb,bb),openTo));continue}
  if(p===heroPos){if(mode===0){actions.push(act("preflop",hero,"fold"));continues=false}else if(mode===1||mode===2)actions.push(act("preflop",hero,"call",paidTo(p,openTo,sb,bb),openTo));else actions.push(act("preflop",hero,"raise",paidTo(p,raiseTo,sb,bb),raiseTo));continue}
  if(opener===heroPos&&p==="BB")actions.push(act("preflop","BB","call",paidTo("BB",openTo,sb,bb),openTo));else actions.push(act("preflop",name,"fold"));
 }
 if(opener!==heroPos&&(mode===3||mode===4))actions.push(act("preflop",opener,"call",raiseTo-openTo,raiseTo));
 if(!continues){for(const p of order.slice(order.indexOf(heroPos)+1))if(!actions.some(a=>a.player===(p===heroPos?hero:p)))actions.push(act("preflop",p,"fold"));}
 if(continues){const heroOrder=postOrder.indexOf(heroPos),vPos=opener===heroPos?"BB":opener, villainOrder=postOrder.indexOf(vPos);const oop=heroOrder<villainOrder?hero:villain,ip=oop===hero?villain:hero;const f=Math.round(bb*4),t=Math.round(bb*9),r=Math.round(bb*18);
  if(n%4===0)actions.push(act("flop",oop,"check"),act("flop",ip,"bet",f,f),act("flop",oop,"call",f,f),act("turn",oop,"check"),act("turn",ip,"bet",t,t),act("turn",oop,"fold"));
  else if(n%4===1)actions.push(act("flop",oop,"bet",f,f),act("flop",ip,"raise",f*3,f*3),act("flop",oop,"call",f*2,f*3),act("turn",oop,"check"),act("turn",ip,"check"),act("river",oop,"bet",r,r),act("river",ip,"call",r,r));
  else if(n%4===2)actions.push(act("flop",oop,"check"),act("flop",ip,"check"),act("turn",oop,"bet",t,t),act("turn",ip,"call",t,t),act("river",oop,"check"),act("river",ip,"check"));
  else actions.push(act("flop",oop,"check"),act("flop",ip,"bet",f,f),act("flop",oop,"raise",f*3,f*3),act("flop",ip,"call",f*2,f*3),act("turn",oop,"bet",t,t),act("turn",ip,"call",t,t),act("river",oop,"bet",r,r),act("river",ip,"fold"));
 }
 const enrichedActions=actions.map((a,index)=>{const actorPosition=a.player===hero?heroPos:a.player;const gto=gtoForAction(a.type,a.street,actorPosition,size);const chosen=a.type==="bet"?gto.raise:a.type==="check"?gto.call:gto[a.type];return {...a,actorPosition,gto,decisionScore:chosen,decisionNumber:index+1}});
 const pot=calculatePot(actions,heroPos,size,sb,bb,ante);const result=Math.round((rnd()-.46)*pot);const usedBoard=continues?board:[];
 return [`TOURNEY-2000-${String(n).padStart(4,"0")}`,new Date(Date.UTC(2026,6,20,9+Math.floor(n/240),n%60)).toISOString().slice(0,16).replace("T"," "),"RN-TEST-2000",`${size}-Max NL Hold'em Tournament`,size,size,heroPos,hero,hole.join(" "),usedBoard.slice(0,3).join(" "),usedBoard[3]||"",usedBoard[4]||"",usedBoard.join(" "),JSON.stringify(enrichedActions),sb,bb,ante,`${sb} / ${bb}`,pot,result,positions.join(" "),`${size}-max 100BB GTO baseline v2`];
}

const rows=[];let hand=1;for(const [size,count] of [[7,350],[6,350],[5,350],[4,350],[3,300],[2,300]])for(let i=0;i<count;i++)rows.push(makeHand(hand++,size));
if(rows.length!==2000)throw new Error(`row count ${rows.length}`);
for(const [i,row] of rows.entries()){const actions=JSON.parse(row[13]);const players=new Set(actions.filter(a=>a.street==="preflop").map(a=>a.player));if(players.size!==row[5])throw new Error(`hand ${i+1}: players ${players.size}/${row[5]}`)}
const csv=[headers,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n");
const csvPath=`${outDir}/pokercraft_tournament_2000_hands_gto_v2.csv`;await fs.writeFile(csvPath,"\uFEFF"+csv,"utf8");

const workbook=await Workbook.fromCSV(csv,{sheetName:"Tournament Hands"});const sheet=workbook.worksheets.getItem("Tournament Hands");
sheet.freezePanes.freezeRows(1);sheet.showGridLines=false;sheet.getRange("A1:V1").format={fill:"#173D34",font:{bold:true,color:"#FFFFFF"}};sheet.getRange("A1:V2001").format.rowHeight=19;sheet.getRange("A:V").format.autofitColumns();sheet.getRange("N:N").format.columnWidthPx=520;
const inspection=await workbook.inspect({kind:"table",range:"Tournament Hands!A1:V8",include:"values",tableMaxRows:8,tableMaxCols:22});console.log(inspection.ndjson);
const preview=await workbook.render({sheetName:"Tournament Hands",range:"A1:V12",scale:1,format:"png"});await fs.writeFile(`${outDir}/preview-gto-v2.png`,new Uint8Array(await preview.arrayBuffer()));
const xlsx=await SpreadsheetFile.exportXlsx(workbook);await xlsx.save(`${outDir}/pokercraft_tournament_2000_hands_gto_v2.xlsx`);
console.log(JSON.stringify({csvPath,rows:rows.length,sizes:Object.fromEntries([2,3,4,5,6,7].map(s=>[s,rows.filter(r=>r[4]===s).length]))}));
