"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, UploadCloud, CheckCircle2, ShieldCheck, ArrowRight, Users, Gamepad2 } from "lucide-react";
import { parsePokerCraftFile } from "@/lib/parser";
import { demo8MaxHands } from "@/lib/demo-8max";
import { usePoker } from "@/components/poker-provider";

export default function UploadPage(){
 const input=useRef<HTMLInputElement>(null); const router=useRouter(); const {setHands}=usePoker();
 const [file,setFile]=useState<File|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 const run=async()=>{if(!file)return;setBusy(true);setError("");try{setHands(await parsePokerCraftFile(file));router.push("/dashboard");}catch(e){setError(e instanceof Error?e.message:"解析できませんでした");setBusy(false);}};
 const loadDemo=()=>{setHands(demo8MaxHands.map(h=>({...h,id:h.id.replace("DEMO8-","IMPORT-DEMO8-")})));router.push("/dashboard")};
 return <main>
  <div className="page-heading"><div><span className="eyebrow">SESSION IMPORT</span><h1>プレイを、次の強さに変える。</h1><p>PokerCraftの履歴を読み込んで、対戦後の判断を静かに振り返ります。</p></div><span className="privacy"><ShieldCheck size={17}/>データは端末内で解析</span></div>
  <Link href="/play" className="practice-entry"><span className="practice-entry-icon"><Gamepad2/></span><span><small>LOCAL PRACTICE</small><b>ランダムハンドをプレイする</b><em>2〜9人卓・10または50ゲーム・終了後に自動レビュー</em></span><ArrowRight/></Link>
  <section className="upload-grid"><div className="upload-card"><div className="step-label">01 / UPLOAD</div>
   <div className={file?"dropzone has-file":"dropzone"} onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setFile(e.dataTransfer.files[0]||null)}}>{file?<><CheckCircle2 size={34}/><strong>{file.name}</strong><span>{(file.size/1024).toFixed(1)} KB・準備完了</span></>:<><span className="upload-icon"><UploadCloud/></span><strong>ハンド履歴をドロップ</strong><span>またはクリックしてファイルを選択</span><small>CSV / TXT　最大 10MB</small></>}<input ref={input} type="file" accept=".csv,.txt" hidden onChange={e=>setFile(e.target.files?.[0]||null)}/></div>
   {error&&<p className="error">{error}</p>}<button className="primary-button" disabled={!file||busy} onClick={run}>{busy?"解析中…":"解析をはじめる"}<ArrowRight size={18}/></button>
   <div className="demo-divider"><span>または</span></div><button className="demo-button" onClick={loadDemo}><Users size={19}/><span><b>8人卓デモデータを読み込む</b><small>8ポジション・全アクション入り</small></span><ArrowRight size={17}/></button>
  </div>
  <div className="process-card"><span className="eyebrow">HOW IT WORKS</span><h2>3ステップで復習開始</h2>{[["01","読み込む","PokerCraftから書き出したファイルを選択"],["02","人数を自動判定","各ハンドを2〜9人卓のレンジで解析"],["03","振り返る","判断が難しかったハンドを日本語で解説"]].map(x=><div className="process-row" key={x[0]}><b>{x[0]}</b><span><strong>{x[1]}</strong><small>{x[2]}</small></span></div>)}<div className="format-note"><FileText size={18}/><span><b>対応フォーマット</b><small>PokerCraft CSV・汎用CSV（人数列がなくてもアクション履歴から推定）</small></span></div></div>
  </section>
  <style jsx global>{`.practice-entry{display:flex;align-items:center;gap:16px;background:#173d34;color:white;border-radius:14px;padding:20px 24px;margin-bottom:22px;box-shadow:0 12px 25px #173d3420}.practice-entry-icon{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#ffffff18}.practice-entry>span:nth-child(2){display:grid;gap:3px;flex:1}.practice-entry small{font-size:8px;letter-spacing:.16em;color:#8ec4b3}.practice-entry b{font-size:17px}.practice-entry em{font-size:10px;font-style:normal;color:#b7cbc5}.demo-divider{display:flex;align-items:center;gap:12px;color:#a1a6a2;font-size:9px;margin:13px 0}.demo-divider:before,.demo-divider:after{content:"";height:1px;background:#e5e1d8;flex:1}.demo-button{width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #bfd0ca;background:#f1f7f4;color:#1e6656;border-radius:8px;padding:12px 14px;cursor:pointer}.demo-button:hover{background:#e7f2ed}.demo-button>span{display:grid;gap:2px;flex:1}.demo-button b{font-size:12px}.demo-button small{font-size:9px;color:#73827d}@media(max-width:600px){.practice-entry{padding:16px}.practice-entry em{display:none}}`}</style>
 </main>
}
