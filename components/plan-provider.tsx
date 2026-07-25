"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PLAN_LIMITS, PlanKey, normalizePlan } from "@/lib/plans";
import { supabase } from "@/lib/supabase";

type PlanState = {
  plan: PlanKey;
  subscriptionStatus: string;
  analyzedHands: number;
  limit: number;
  remaining: number;
  nextResetAt: string;
  loading: boolean;
  refresh: () => Promise<void>;
  consumeAnalysis: (count: number) => Promise<{ ok: boolean; error?: string }>;
};

const PlanContext = createContext<PlanState | null>(null);

function addMonthsClamped(date: Date, months: number) {
  const targetYear = date.getUTCFullYear() + Math.floor((date.getUTCMonth() + months) / 12);
  const targetMonth = (date.getUTCMonth() + months) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(date.getUTCDate(), lastDay)));
}

function usageCycle(createdAt?: string) {
  const registered = createdAt ? new Date(createdAt) : new Date();
  const now = new Date();
  let months = (now.getUTCFullYear() - registered.getUTCFullYear()) * 12 + now.getUTCMonth() - registered.getUTCMonth();
  let start = addMonthsClamped(registered, Math.max(0, months));
  if (start > now) start = addMonthsClamped(registered, Math.max(0, --months));
  const end = addMonthsClamped(registered, Math.max(0, months) + 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [plan, setPlan] = useState<PlanKey>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [analyzedHands, setAnalyzedHands] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [bonusUsed, setBonusUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const cycle = useMemo(() => usageCycle(user?.created_at), [user?.created_at]);

  const refresh = useCallback(async () => {
    if (!user || !supabase) {
      setPlan("free");
      setSubscriptionStatus("inactive");
      setAnalyzedHands(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: profile }, { data: usage }] = await Promise.all([
      supabase.from("profiles").select("plan,subscription_status,bonus_hands_balance").eq("id", user.id).maybeSingle(),
      supabase.from("usage_monthly").select("analyzed_hands,bonus_hands_used").eq("user_id", user.id).eq("month", cycle.start).maybeSingle(),
    ]);
    setPlan(normalizePlan(profile?.plan));
    setSubscriptionStatus(profile?.subscription_status ?? "inactive");
    setAnalyzedHands(usage?.analyzed_hands ?? 0);
    setBonusBalance(profile?.bonus_hands_balance ?? 0);
    setBonusUsed(usage?.bonus_hands_used ?? 0);
    setLoading(false);
  }, [user, cycle.start]);

  useEffect(() => { void refresh(); }, [refresh]);

  const consumeAnalysis = useCallback(async (count: number) => {
    if (!session || !supabase) return { ok: false, error: "解析を保存するにはログインしてください。" };
    const { data, error } = await supabase.rpc("consume_analysis_quota", { requested_hands: count });
    if (error) return { ok: false, error: "利用数を更新できませんでした。時間を置いて再度お試しください。" };
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.allowed) {
      setAnalyzedHands(result?.used_hands ?? analyzedHands);
      return { ok: false, error: `次回リセットまでの解析上限（${result?.limit_hands ?? PLAN_LIMITS[plan].analyzedHands}ハンド）に達します。` };
    }
    setAnalyzedHands(result.used_hands);
    await refresh();
    return { ok: true };
  }, [session, plan, analyzedHands, refresh]);

  const limit = PLAN_LIMITS[plan].analyzedHands + bonusBalance + bonusUsed;
  const value = useMemo(() => ({
    plan,
    subscriptionStatus,
    analyzedHands,
    limit,
    remaining: Math.max(0, limit - analyzedHands),
    nextResetAt: cycle.end,
    loading,
    refresh,
    consumeAnalysis,
  }), [plan, subscriptionStatus, analyzedHands, limit, loading, refresh, consumeAnalysis, cycle.end]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used inside PlanProvider");
  return value;
}
