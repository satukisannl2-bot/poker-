import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span className="eyebrow">PAGE NOT FOUND</span>
      <strong>404</strong>
      <h1>ページが見つかりません</h1>
      <p>ページが削除されたか、URLが変更された可能性があります。</p>
      <div>
        <Link href="/">ホームへ戻る</Link>
        <Link href="/upload" className="secondary">ファイル読込へ</Link>
      </div>
      <style>{`
        .not-found-page{min-height:65vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:42px}
        .not-found-page>strong{font-size:72px;line-height:1;color:#1e6656;margin:18px 0 8px}
        .not-found-page h1{font-size:28px;margin:0 0 10px}
        .not-found-page p{font-size:12px;color:var(--muted);margin:0 0 24px}
        .not-found-page>div{display:flex;gap:10px}
        .not-found-page a{padding:12px 18px;border-radius:8px;background:#1e6656;color:white;font-size:12px;font-weight:700}
        .not-found-page a.secondary{background:#e7ece9;color:#1e6656}
        @media(max-width:600px){.not-found-page{min-height:60vh;padding:28px 18px}.not-found-page>strong{font-size:56px}.not-found-page h1{font-size:22px}.not-found-page>div{width:100%;display:grid}}
      `}</style>
    </main>
  );
}
