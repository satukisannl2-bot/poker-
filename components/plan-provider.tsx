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
  loading: boolean;
  refresh: () => Promise<void>;
  consumeAnalysis: (count: number) => Promise<{ ok: boolean; error?: string }>;
};

const PlanContext = createContext<PlanState | null>(null);

function monthStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [plan, setPlan] = useState<PlanKey>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [analyzedHands, setAnalyzedHands] = useState(0);
  const [loading, setLoading] = useState(true);

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
      supabase.from("profiles").select("plan,subscription_status").eq("id", user.id).maybeSingle(),
      supabase.from("usage_monthly").select("analyzed_hands").eq("user_id", user.id).eq("month", monthStart()).maybeSingle(),
    ]);
    setPlan(normalizePlan(profile?.plan));
    setSubscriptionStatus(profile?.subscription_status ?? "inactive");
    setAnalyzedHands(usage?.analyzed_hands ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const consumeAnalysis = useCallback(async (count: number) => {
    if (!session || !supabase) return { ok: false, error: "解析を保存するにはログインしてください。" };
    const { data, error } = await supabase.rpc("consume_analysis_quota", { requested_hands: count });
    if (error) return { ok: false, error: "利用数を更新できませんでした。時間を置いて再度お試しください。" };
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.allowed) {
      setAnalyzedHands(result?.used_hands ?? analyzedHands);
      return { ok: false, error: `今月の解析上限（${result?.limit_hands ?? PLAN_LIMITS[plan].analyzedHands}ハンド）に達します。` };
    }
    setAnalyzedHands(result.used_hands);
    return { ok: true };
  }, [session, plan, analyzedHands]);

  const limit = PLAN_LIMITS[plan].analyzedHands;
  const value = useMemo(() => ({
    plan,
    subscriptionStatus,
    analyzedHands,
    limit,
    remaining: Math.max(0, limit - analyzedHands),
    loading,
    refresh,
    consumeAnalysis,
  }), [plan, subscriptionStatus, analyzedHands, limit, loading, refresh, consumeAnalysis]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used inside PlanProvider");
  return value;
}
