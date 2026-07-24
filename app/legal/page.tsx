export default function Legal() {
  const rows = [
    ["販売業者", "正式な個人名または登記上の名称を公開前に記載"],
    ["運営責任者", "公開前に記載"],
    ["所在地・電話番号", "請求があった場合、遅滞なく開示します。開示請求先は公開前に設定します。"],
    ["サービス名", "RiverNote"],
    ["販売価格", "STANDARDプラン：月額500円（税込）"],
    ["商品代金以外の必要料金", "インターネット接続料金、通信料金等は利用者の負担です。"],
    ["支払方法", "クレジットカード（Stripe）"],
    ["支払時期", "申込時に決済し、以後1か月ごとに自動更新します。"],
    ["サービス提供時期", "決済完了後、直ちに有料機能を利用できます。"],
    ["解約", "アカウント画面からいつでも解約できます。解約後は次回更新日以降の請求を停止します。"],
    ["返品・返金", "デジタルサービスの性質上、提供開始後の返品はできません。法令上必要な場合を除き、利用期間途中の返金・日割り返金は行いません。"],
    ["動作環境", "最新版のChrome、Safari、Edge。JavaScriptとCookieを有効にしてください。"],
  ];
  return (
    <main className="legal-page">
      <span className="eyebrow">COMMERCIAL TRANSACTIONS</span>
      <h1>特定商取引法に基づく表記</h1>
      <p className="legal-updated">最終更新日：2026年7月25日</p>
      <div className="legal-table">
        {rows.map(([label, value]) => <div key={label}><strong>{label}</strong><p>{value}</p></div>)}
      </div>
      <aside className="legal-warning">販売開始前に正式な販売業者名、運営責任者、開示請求を受け取れるメールアドレスを必ず設定してください。このページだけでは販売開始の要件を満たしません。</aside>
    </main>
  );
}
