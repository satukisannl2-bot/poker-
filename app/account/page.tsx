"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { usePlan } from "@/components/plan-provider";

export default function Account() {
  const { user, session, loading, signOut } = useAuth();
  const plan = usePlan();

  async function portal() {
    if (!session) return;
    const response = await fetch("/api/stripe/portal", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await response.json();
    if (data.url) location.href = data.url;
    else alert(data.error);
  }

  if (loading) return <main>読み込み中…</main>;
  if (!user) return <main><div className="account-card"><h1>アカウント</h1><p>クラウド保存と利用数の管理にはログインしてください。</p><Link href="/login">ログイン・無料登録</Link></div></main>;

  const usageRate = Math.min(100, Math.round((plan.analyzedHands / plan.limit) * 100));
  return (
    <main>
      <div className="account-card">
        <span className="eyebrow">MY ACCOUNT</span>
        <h1>アカウント</h1>
        <dl><dt>メール</dt><dd>{user.email}</dd><dt>プラン</dt><dd><b>{plan.plan === "standard" ? "STANDARD" : "FREE"}</b></dd><dt>契約状態</dt><dd>{plan.subscriptionStatus === "active" ? "有効" : "無料利用中"}</dd></dl>
        <section className="usage-box">
          <div><strong>今月の解析数</strong><span>{plan.analyzedHands} / {plan.limit} ハンド</span></div>
          <i><b style={{ width: `${usageRate}%` }}/></i>
          <small>残り {plan.remaining} ハンド</small>
        </section>
        {plan.plan === "standard" ? <button onClick={portal}>契約・支払いを管理</button> : <Link href="/pricing">月額500円にアップグレード</Link>}
        <button className="logout" onClick={async () => { await signOut(); location.href = "/login"; }}>ログアウト</button>
      </div>
      <style jsx>{`
        .account-card{max-width:640px;background:#fffefa;border:1px solid #e5e1d8;border-radius:14px;padding:30px}
        .account-card dl{display:grid;grid-template-columns:110px 1fr}.account-card dt,.account-card dd{padding:12px;border-bottom:1px solid #eee;margin:0}
        .account-card button,.account-card a{display:block;width:100%;margin-top:12px;border:0;border-radius:7px;padding:13px;background:#1e6656;color:white;text-align:center;cursor:pointer}
        .account-card .logout{background:#e9e9e5;color:#42504b}.usage-box{margin:22px 0;padding:18px;background:#f1f6f3;border-radius:10px}
        .usage-box>div{display:flex;justify-content:space-between;font-size:12px}.usage-box i{display:block;height:7px;background:#dce5e1;border-radius:8px;margin:12px 0 7px;overflow:hidden}
        .usage-box i b{display:block;height:100%;background:#1e6656}.usage-box small{color:#72807a}
      `}</style>
    </main>
  );
}
