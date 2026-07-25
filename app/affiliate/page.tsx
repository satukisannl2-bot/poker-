import Link from "next/link";

export const metadata = { title:"紹介プログラム", description:"RiverNoteの紹介プログラムとアフィリエイト広告に関する方針。" };

export default function AffiliatePage(){
 return <main className="legal-page">
  <span className="eyebrow">REFERRAL & AFFILIATE</span>
  <h1>紹介プログラム</h1>
  <p>RiverNoteをポーカー仲間へ紹介できる無料の紹介リンクを用意しています。登録後、アカウント画面から自分専用リンクを確認できます。</p>
  <section><h2>現在の紹介特典</h2><p>現在は紹介人数の記録のみを行い、金銭・賞金・ゲーム内通貨等の報酬は提供していません。将来特典を追加する場合は条件を事前に明示します。</p></section>
  <section><h2>広告・アフィリエイト表記</h2><p>今後、外部商品・サービスのアフィリエイトリンクを掲載する場合があります。その場合、該当ページとリンク付近に「広告」「PR」「アフィリエイト広告を利用しています」等を分かりやすく表示します。</p></section>
  <section><h2>掲載しないもの</h2><p>オンライン賭博への入金誘導、賞金や勝利を保証する表現、リアルタイム不正支援、利用者に不利益となる誇大広告は掲載しません。</p></section>
  <aside className="legal-warning">紹介リンクの不正登録、迷惑投稿、虚偽・誇大な説明は禁止します。</aside>
  <p><Link href="/login?mode=signup">無料登録して紹介リンクを作る</Link></p>
 </main>;
}
