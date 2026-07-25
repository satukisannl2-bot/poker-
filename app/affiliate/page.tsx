import Link from "next/link";

export const metadata={title:"広告と友達紹介について",description:"RiverNoteの広告掲載方針と友達紹介ボーナスの条件"};

export default function AffiliatePage(){
 return <main className="legal-page">
  <span className="eyebrow">ADS & REFERRAL</span>
  <h1>広告と友達紹介について</h1>
  <section><h2>広告掲載について</h2><p>RiverNoteでは運営費をまかなうため、ページ内にディスプレイ広告を掲載する場合があります。広告は「広告」と分かる形で表示し、外部商品の購入成果に応じたアフィリエイト紹介は現在行いません。</p></section>
  <section><h2>友達紹介ボーナス</h2><p>あなたの紹介リンクから登録したユーザーが、RiverNoteで累計100ハンドを保存すると、紹介者の無料ハンド残高へ500ハンドを一度だけ追加します。登録しただけでは付与されません。</p></section>
  <section><h2>ボーナスの使い方</h2><p>通常の無料枠を使い切った後も、獲得したボーナス残高から解析できます。使ったボーナスだけ残高が減り、登録日基準の月次リセットでは消えません。</p></section>
  <section><h2>不正利用の防止</h2><p>自己紹介、複数アカウント、虚偽データや自動生成データだけを使った条件達成、迷惑な紹介投稿は対象外です。不正と判断した場合は付与の取消しや利用停止を行うことがあります。</p></section>
  <p><Link href="/login?mode=signup">無料登録して紹介リンクを作る</Link></p>
 </main>;
}
