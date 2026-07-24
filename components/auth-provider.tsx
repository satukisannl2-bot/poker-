"use client";
import { createContext,useContext,useEffect,useState } from "react";
import type { Session,User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
type Auth={user:User|null;session:Session|null;loading:boolean;signOut:()=>Promise<void>};
const Context=createContext<Auth>({user:null,session:null,loading:true,signOut:async()=>{}});
export function AuthProvider({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!supabase){setLoading(false);return}supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data}=supabase.auth.onAuthStateChange((_,next)=>setSession(next));return()=>data.subscription.unsubscribe()},[]);
 return <Context.Provider value={{user:session?.user??null,session,loading,signOut:async()=>{await supabase?.auth.signOut()}}}>{children}</Context.Provider>
}
export const useAuth=()=>useContext(Context);
