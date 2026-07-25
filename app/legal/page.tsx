export default function Legal() {
  const rows = [
    ["販売業者", "正式な個人名または登記上の名称を公開前に記載"],
    ["運営責任者", "公開前に記載"],
    ["所在地・電話番号", "請求があった場合、遅滞なく開示します。開示請求先は公開前に設定します。"],
    ["サービス名", "RiverNote"],
    ["販売価格", "現在は無料で提供しています。"],
    ["商品代金以外の必要料金", "インターネット接続料金、通信料金等は利用者の負担です。"],
    ["支払方法", "現在、決済は受け付けていません。"],
    ["支払時期", "現在、利用料金は発生しません。"],
    ["サービス提供時期", "アカウント登録後、直ちに無料機能を利用できます。"],
    ["利用停止", "ログアウトまたは運営者へのアカウント削除依頼により利用を停止できます。"],
    ["返品・返金", "現在は利用料金を受領していないため、返金は発生しません。"],
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
      <aside className="legal-warning">将来有料販売を開始する前に、正式な販売業者名、運営責任者、開示請求を受け取れるメールアドレスなど、必要事項を設定します。</aside>
    </main>
  );
}
