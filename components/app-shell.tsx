"use client";
import Link from "next/link"; import { usePathname } from "next/navigation";
import { BarChart3, Upload, AlertTriangle, Award, Layers3, Menu, X, Gamepad2, UserRound, CreditCard } from "lucide-react";
import { useState } from "react";
const nav=[{href:"/play",label:"ゲームをプレイ",icon:Gamepad2},{href:"/upload",label:"ファイル読込",icon:Upload},{href:"/dashboard",label:"ダッシュボード",icon:BarChart3},{href:"/improvements",label:"改善ハンド",icon:AlertTriangle},{href:"/good-hands",label:"良かったハンド",icon:Award},{href:"/pricing",label:"料金プラン",icon:CreditCard},{href:"/account",label:"アカウント",icon:UserRound}];
export function AppShell({children}:{children:React.ReactNode}){const path=usePathname();const [open,setOpen]=useState(false);return <div className="app-shell">
  <aside className={open?"sidebar open":"sidebar"}><div className="brand"><span className="brand-mark"><Layers3 size={20}/></span><span>RiverNote</span><button className="close-menu" onClick={()=>setOpen(false)}><X/></button></div><div className="side-label">POST-GAME REVIEW</div><nav>{nav.map(n=><Link key={n.href} href={n.href} onClick={()=>setOpen(false)} className={path.startsWith(n.href)?"active":""}><n.icon size={19}/>{n.label}</Link>)}</nav><div className="side-note"><span className="status-dot"/>オフライン分析モード<small>対戦中の支援機能はありません</small></div></aside>
  <div className="content"><header className="mobile-header"><button onClick={()=>setOpen(true)}><Menu/></button><span>RiverNote</span></header>{children}</div>{open&&<div className="backdrop" onClick={()=>setOpen(false)}/>}</div>}
