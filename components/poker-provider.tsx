"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Hand } from "@/lib/types";
import { sampleHands } from "@/lib/sample-data";
import { demo8MaxHands } from "@/lib/demo-8max";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
type Context={hands:Hand[]; setHands:(h:Hand[])=>void; saved:string[]; toggleSaved:(id:string)=>void};
const PokerContext=createContext<Context|null>(null);
export function PokerProvider({children}:{children:React.ReactNode}){
  const {user}=useAuth();
  const [hands,setHandsState]=useState<Hand[]>(sampleHands); const [saved,setSaved]=useState<string[]>([]);
  useEffect(()=>{try{const h=localStorage.getItem("rivernote:hands");const s=localStorage.getItem("rivernote:saved");if(h){const parsed:Hand[]=JSON.parse(h);if(parsed.some(x=>x.id.includes("DEMO8-"))){const fresh=demo8MaxHands.map(x=>({...x,id:x.id.replace("DEMO8-","IMPORT-DEMO8-")}));setHandsState(fresh);localStorage.setItem("rivernote:hands",JSON.stringify(fresh));}else setHandsState(parsed);}if(s)setSaved(JSON.parse(s));}catch{}},[]);
  useEffect(()=>{if(!user||!supabase)return;supabase.from("hands").select("raw_data,is_saved").eq("user_id",user.id).order("created_at").then(({data})=>{const cloud=(data??[]).map(row=>row.raw_data as Hand).filter(Boolean);if(cloud.length){setHandsState(cloud);setSaved((data??[]).filter(row=>row.is_saved).map(row=>(row.raw_data as Hand).id))}})},[user]);
  const setHands=(h:Hand[])=>{setHandsState(h);localStorage.setItem("rivernote:hands",JSON.stringify(h));if(user&&supabase)void supabase.from("hands").upsert(h.map(hand=>({id:hand.id,user_id:user.id,played_at:hand.playedAt,position:hand.position,stakes:hand.stakes,hole_cards:hand.holeCards,board:hand.board,pot:hand.pot,result:hand.result,actions:hand.actions,recommendation:hand.recommendation,decision_score:hand.score,issue:hand.issue,explanation:hand.explanation,raw_data:hand})))};
  const toggleSaved=(id:string)=>setSaved(prev=>{const n=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];localStorage.setItem("rivernote:saved",JSON.stringify(n));if(user&&supabase)void supabase.from("hands").update({is_saved:n.includes(id)}).eq("id",id).eq("user_id",user.id);return n;});
  return <PokerContext.Provider value={{hands,setHands,saved,toggleSaved}}>{children}</PokerContext.Provider>;
}
export const usePoker=()=>{const c=useContext(PokerContext);if(!c)throw new Error("PokerProvider missing");return c;};
