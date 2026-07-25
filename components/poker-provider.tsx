"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Hand } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";
import { usePlan } from "@/components/plan-provider";
import { supabase } from "@/lib/supabase";

type DataSource = "empty" | "user" | "demo" | "practice";
type SaveOptions = { source?: DataSource; persist?: boolean; countQuota?: boolean };
type SaveResult = { ok: boolean; error?: string };
type Context = {
  hands: Hand[];
  saved: string[];
  dataSource: DataSource;
  loading: boolean;
  setHands: (hands: Hand[], options?: SaveOptions) => Promise<SaveResult>;
  toggleSaved: (id: string) => void;
};

const PokerContext = createContext<Context | null>(null);

const rowFor = (hand: Hand, userId: string) => ({
  id: hand.id,
  user_id: userId,
  played_at: hand.playedAt,
  position: hand.position,
  stakes: hand.stakes,
  hole_cards: hand.holeCards,
  board: hand.board,
  pot: hand.pot,
  result: hand.result,
  actions: hand.actions,
  recommendation: hand.recommendation,
  decision_score: hand.score,
  issue: hand.issue,
  explanation: hand.explanation,
  raw_data: hand,
});

export function PokerProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { refresh: refreshPlan } = usePlan();
  const [hands, setHandsState] = useState<Hand[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>("empty");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setHandsState([]);
      setSaved([]);
      setDataSource("empty");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const handKey = `rivernote:${user.id}:hands`;
    const savedKey = `rivernote:${user.id}:saved`;
    const sourceKey = `rivernote:${user.id}:source`;
    let localHands: Hand[] = [];
    let localSaved: string[] = [];
    let localSource: DataSource = "empty";
    try {
      localHands = JSON.parse(localStorage.getItem(handKey) ?? "[]");
      localSaved = JSON.parse(localStorage.getItem(savedKey) ?? "[]");
      const storedSource = localStorage.getItem(sourceKey);
      if (storedSource === "user" || storedSource === "demo" || storedSource === "practice") localSource = storedSource;
    } catch {}

    const load = async () => {
      setLoading(true);
      if (!supabase) {
        if (!cancelled) {
          setHandsState(localHands);
          setSaved(localSaved);
          setDataSource(localHands.length ? localSource : "empty");
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase.from("hands").select("raw_data,is_saved").eq("user_id", user.id).order("created_at");
      if (cancelled) return;
      if (error) {
        setHandsState(localHands);
        setSaved(localSaved);
        setDataSource(localHands.length ? localSource : "empty");
      } else {
        const cloud = (data ?? []).map(row => row.raw_data as Hand).filter(Boolean);
        if (cloud.length) {
          setHandsState(cloud);
          setSaved((data ?? []).filter(row => row.is_saved).map(row => (row.raw_data as Hand).id));
          setDataSource(
            cloud.every(hand => hand.id.startsWith("IMPORT-DEMO8-")) ? "demo"
              : cloud.every(hand => hand.id.startsWith("PRACTICE-")) ? "practice"
                : "user"
          );
        } else if (localSource === "demo" && localHands.length) {
          setHandsState(localHands);
          setSaved([]);
          setDataSource("demo");
        } else {
          setHandsState([]);
          setSaved([]);
          setDataSource("empty");
        }
      }
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const setHands = useCallback(async (nextHands: Hand[], options: SaveOptions = {}): Promise<SaveResult> => {
    if (!user) return { ok: false, error: "ログインしてください。" };
    const source = options.source ?? "user";
    const persist = options.persist ?? true;

    if (persist && !supabase) return { ok: false, error: "クラウド保存に接続できません。" };
    if (persist && supabase) {
      if (options.countQuota) {
        const { data, error } = await supabase.rpc("save_analysis_batch", { hand_rows: nextHands });
        if (error) return { ok: false, error: `保存できませんでした：${error.message}` };
        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.allowed) return { ok: false, error: `次回リセットまでの解析上限（${result?.limit_hands ?? 500}ハンド）を超えます。` };
        await refreshPlan();
      } else {
        const { error } = await supabase.from("hands").upsert(nextHands.map(hand => rowFor(hand, user.id)), { onConflict: "user_id,id" });
        if (error) return { ok: false, error: `保存できませんでした：${error.message}` };
      }
    }

    setHandsState(nextHands);
    setDataSource(nextHands.length ? source : "empty");
    try {
      localStorage.setItem(`rivernote:${user.id}:hands`, JSON.stringify(nextHands));
      localStorage.setItem(`rivernote:${user.id}:source`, nextHands.length ? source : "empty");
    } catch {}
    return { ok: true };
  }, [user, refreshPlan]);

  const toggleSaved = useCallback((id: string) => {
    if (!user) return;
    setSaved(previous => {
      const next = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id];
      try { localStorage.setItem(`rivernote:${user.id}:saved`, JSON.stringify(next)); } catch {}
      if (supabase) void supabase.from("hands").update({ is_saved: next.includes(id) }).eq("id", id).eq("user_id", user.id);
      return next;
    });
  }, [user]);

  return <PokerContext.Provider value={{ hands, saved, dataSource, loading, setHands, toggleSaved }}>{children}</PokerContext.Provider>;
}

export const usePoker = () => {
  const context = useContext(PokerContext);
  if (!context) throw new Error("PokerProvider missing");
  return context;
};
