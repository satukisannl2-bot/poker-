"use client";
import { FormEvent,useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[mode,setMode]=useState<"login"|"signup">("login"),[message,setMessage]=useState(""),[hasRef,setHasRef]=useState(false);
 const router=useRouter();
 useEffect(()=>{const params=new URLSearchParams(location.search);if(params.get("mode")==="signup")setMode("signup");setHasRef(Boolean(params.get("ref")))},[]);
 async function submit(e:FormEvent){
  e.preventDefault();
  if(!supabase){setMessage("Supabaseの接続情報を設定してください");return}
  const ref=new URLSearchParams(location.search).get("ref")?.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,16);
  const result=mode==="signup"
   ?await supabase.auth.signUp({email,password,options:{data:ref?{referral_code:ref}:{}}})
   :await supabase.auth.signInWithPassword({email,password});
  if(result.error)setMessage(result.error.message);
  else{setMessage(mode==="signup"?"確認メールを送信しました":"ログインしました");const next=new URLSearchParams(location.search).get("next");router.push(next?.startsWith("/")?next:"/account")}
 }
 return <main><div className="auth-card"><span className="eyebrow">RIVERNOTE ACCOUNT</span><h1>{mode==="login"?"ログイン":"無料アカウント作成"}</h1><p>ハンド履歴をユーザーごとに安全に保存します。</p>{hasRef&&<p className="ref-note">紹介リンクからの登録です</p>}<form onSubmit={submit}><label>メール<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>パスワード<input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary-button">{mode==="login"?"ログイン":"登録"}</button></form>{message&&<p>{message}</p>}<button className="text-button" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"初めての方はこちら":"ログインへ戻る"}</button></div><style jsx>{`.auth-card{max-width:470px;margin:40px auto;background:#fffefa;border:1px solid #e5e1d8;border-radius:14px;padding:36px}.auth-card h1{margin:8px 0}.auth-card>p{color:#6f7772;font-size:12px}.ref-note{padding:9px;background:#edf5f1;color:#1e6656!important;border-radius:7px}.auth-card form{display:grid;gap:15px;margin-top:25px}.auth-card label{display:grid;gap:6px;font-size:11px}.auth-card input{border:1px solid #dcd9d1;border-radius:7px;padding:12px}.text-button{border:0;background:none;color:#1e6656;margin-top:15px;cursor:pointer}`}</style></main>
}
