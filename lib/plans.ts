export const PLAN_LIMITS = {
  free: { name: "FREE", monthlyPrice: 0, analyzedHands: 500 },
  standard: { name: "STANDARD", monthlyPrice: 500, analyzedHands: 2000 },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function normalizePlan(plan?: string | null): PlanKey {
  return plan === "standard" || plan === "pro" ? "standard" : "free";
}
