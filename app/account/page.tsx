"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePlan } from "@/components/plan-provider";
import { supabase } from "@/lib/supabase";

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const plan = usePlan();
  const [referralCode,setReferralCode]=useState("");
  const [registeredCount,setRegisteredCount]=useState(0);
  const [qualifiedCount,setQualifiedCount]=useState(0);
  const [bonusBalance,setBonusBalance]=useState(0);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{if(!user||!supabase)return;void Promise.all([
    supabase.from("profiles").select("referral_code,bonus_hands_balance").eq("id",user.id).maybeSingle(),
    supabase.from("affiliate_events").select("reward_status").eq("referrer_id",user.id).eq("event_type","signup"),
  ]).then(([profile,events])=>{
    setReferralCode(profile.data?.referral_code??"");
    setBonusBalance(profile.data?.bonus_hands_balance??0);
    setRegisteredCount(events.data?.length??0);
    setQualifiedCount(events.data?.filter(event=>event.reward_status==="earned").length??0);
  })},[user]);

  if (loading) return <main>読み込み中…</main>;
  if (!user) return <main><div className="account-card"><h1>アカウント</h1><p>利用状況を見るにはログインしてください。</p><Link href="/login">ログイン・無料登録</Link></div></main>;

  const usageRate=Math.min(100,Math.round((plan.analyzedHands/Math.max(1,plan.limit))*100));
  const referralUrl=`https://poker-theta.vercel.app/r/${referralCode}`;
  return <main><div className="account-card">
    <span className="eyebrow">MY ACCOUNT</span><h1>アカウント</h1>
    <dl><dt>メール</dt><dd>{user.email}</dd><dt>プラン</dt><dd><b>FREE</b></dd></dl>
    <section className="usage-box">
      <div><strong>今回の利用期間</strong><span>{plan.analyzedHands} / {plan.limit} ハンド</span></div>
      <i><b style={{width:`${usageRate}%`}}/></i>
      <small>残り {plan.remaining} ハンド</small>
      <small>紹介ボーナス残高：{bonusBalance} ハンド</small>
      <small>次回リセット：{new Date(`${plan.nextResetAt}T00:00:00Z`).toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"})}</small>
    </section>
    <section className="referral-box">
      <strong>友達紹介ボーナス</strong>
      <p>紹介した相手がRiverNoteで累計100ハンドを保存すると、あなたの無料ハンド残高へ<b>500ハンド</b>を一度だけ追加します。</p>
      <div className="referral-stats"><span>登録 <b>{registeredCount}人</b></span><span>100ハンド達成 <b>{qualifiedCount}人</b></span><span>獲得済み <b>{qualifiedCount*500}ハンド</b></span></div>
      {referralCode&&<><input aria-label="紹介リンク" readOnly value={referralUrl}/><button onClick={async()=>{await navigator.clipboard.writeText(referralUrl);setCopied(true)}}>{copied?"コピーしました":"紹介リンクをコピー"}</button></>}
      <small>自己紹介、複数アカウント、不正な自動プレイによる付与は対象外です。</small>
    </section>
    <button className="logout" onClick={async()=>{await signOut();location.href="/login"}}>ログアウト</button>
  </div><style jsx>{`
    .account-card{max-width:680px;background:#fffefa;border:1px solid #e5e1d8;border-radius:14px;padding:30px}
    dl{display:grid;grid-template-columns:110px 1fr}dt,dd{padding:12px;border-bottom:1px solid #eee;margin:0}
    button,a{display:block;width:100%;margin-top:12px;border:0;border-radius:7px;padding:13px;background:#1e6656;color:white;text-align:center;cursor:pointer}
    .logout{background:#e9e9e5;color:#42504b}.usage-box{margin:22px 0;padding:18px;background:#f1f6f3;border-radius:10px}
    .usage-box>div{display:flex;justify-content:space-between;font-size:12px}.usage-box i{display:block;height:7px;background:#dce5e1;border-radius:8px;margin:12px 0 7px;overflow:hidden}
    .usage-box i b{display:block;height:100%;background:#1e6656}.usage-box small{display:block;color:#72807a;margin-top:4px}
    .referral-box{margin:18px 0;padding:20px;border:1px solid #dce5e1;border-radius:10px}.referral-box p,.referral-box small{font-size:12px;line-height:1.8;color:#5d6c66}
    .referral-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.referral-stats span{padding:10px;background:#f1f6f3;border-radius:7px;font-size:11px}.referral-stats b{display:block;font-size:15px;color:#1e6656}
    input{width:100%;padding:11px;border:1px solid #d7ddd9;border-radius:7px;background:#fafbf9}@media(max-width:600px){.referral-stats{grid-template-columns:1fr}}
  `}</style></main>;
}
