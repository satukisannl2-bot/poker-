"use client";

import Dashboard from "../dashboard/page";

export default function PlayResultsPage(){
  return <div className="play-results-page">
    <div className="results-label">
      <span>PRACTICE SESSION RESULTS</span>
      <strong>ゲーム結果</strong>
      <a href="/play">新しいゲームを始める</a>
    </div>
    <Dashboard/>
    <style jsx global>{`
      .play-results-page .results-label{display:flex;align-items:center;gap:18px;margin:8px 0 22px;padding:16px 20px;background:#173f36;color:#fff;border-radius:12px}
      .play-results-page .results-label span{font-size:9px;letter-spacing:.18em;opacity:.7}
      .play-results-page .results-label strong{font-size:18px}
      .play-results-page .results-label a{margin-left:auto;background:#f4eee2;color:#173f36;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:11px;font-weight:700}
      @media(max-width:600px){.play-results-page .results-label{align-items:flex-start;flex-direction:column}.play-results-page .results-label a{margin-left:0;width:100%;text-align:center}}
    `}</style>
  </div>
}
