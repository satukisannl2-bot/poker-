"use client";

import { useEffect } from "react";

declare global {
  interface Window { adsbygoogle?: Record<string, unknown>[] }
}

export function AdSlot({ slot }: { slot: string }) {
  const publisher=process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  useEffect(()=>{
    if(!publisher)return;
    try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch{}
  },[publisher,slot]);
  if(!publisher)return null;
  return <aside className="display-ad" aria-label="広告">
    <small>広告</small>
    <ins className="adsbygoogle" style={{display:"block"}} data-ad-client={publisher} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/>
  </aside>;
}
