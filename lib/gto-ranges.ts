import { HandAction, Position } from "./types";

export const positionsForTable = (size: number): Position[] => {
  const layouts: Record<number, Position[]> = {
    2: ["SB", "BB"],
    3: ["BTN", "SB", "BB"],
    4: ["CO", "BTN", "SB", "BB"],
    5: ["HJ", "CO", "BTN", "SB", "BB"],
    6: ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
    7: ["UTG", "UTG+1", "HJ", "CO", "BTN", "SB", "BB"],
    8: ["UTG", "UTG+1", "MP", "HJ", "CO", "BTN", "SB", "BB"],
    9: ["UTG", "UTG+1", "MP", "MP+1", "HJ", "CO", "BTN", "SB", "BB"],
  };
  return layouts[Math.max(2, Math.min(9, size))] ?? layouts[8];
};

const rankValue: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10, "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2 };
const rankOf = (card: string) => card.toUpperCase().replace("10", "T").match(/[2-9TJQKA]/)?.[0] ?? "2";
const suitOf = (card: string) => card.slice(-1).toLowerCase();

function handStrength(cards: string[]) {
  if (cards.length < 2) return 50;
  const a = rankValue[rankOf(cards[0])], b = rankValue[rankOf(cards[1])];
  const hi = Math.max(a, b), lo = Math.min(a, b), pair = a === b, suited = suitOf(cards[0]) === suitOf(cards[1]);
  const gap = hi - lo;
  if (pair) return Math.min(99, 48 + hi * 3.6);
  let score = hi * 4 + lo * 1.55 + (suited ? 6 : 0) + (gap === 1 ? 5 : gap === 2 ? 2 : 0);
  if (hi === 14) score += 7;
  return Math.max(3, Math.min(98, score));
}

const openingTarget = (position: Position, size: number) => {
  const target: Partial<Record<Position, number>> = { UTG: 16, "UTG+1": 18, MP: 21, "MP+1": 23, HJ: 27, CO: 34, BTN: size === 2 ? 65 : 49, SB: size === 2 ? 70 : 46, BB: 35 };
  const shortHandedBoost = Math.max(0, 6 - size) * 3;
  return Math.min(72, (target[position] ?? 25) + shortHandedBoost);
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function getPreflopGtoBaseline(input: {
  cards: string[]; position: Position; tableSize: number; actions: HandAction[]; hero: string;
  effectiveStackBb?: number; anteBb?: number; bigBlind?: number;
}) {
  const strength = handStrength(input.cards);
  const preflop = input.actions.filter((a) => a.street === "preflop");
  const heroIndex = preflop.findIndex((a) => a.player === input.hero);
  const beforeHero = heroIndex >= 0 ? preflop.slice(0, heroIndex) : preflop;
  const facingRaise = beforeHero.some((a) => a.type === "raise");
  const raisesBeforeHero = beforeHero.filter((a) => a.type === "raise");
  const callsBeforeHero = beforeHero.filter((a) => a.type === "call");
  const target = openingTarget(input.position, input.tableSize);
  const threshold = 100 - target;
  let fold: number, call: number, raise: number;

  if (!facingRaise) {
    const edge = strength - threshold;
    raise = clamp(50 + edge * 8);
    call = input.position === "BB" ? clamp(25 - Math.abs(edge) * 2) : clamp(8 - Math.abs(edge));
    fold = 100 - raise - call;
  } else {
    const defendThreshold = threshold + (input.position === "BB" ? -10 : 5);
    const edge = strength - defendThreshold;
    raise = clamp(edge > 14 ? 65 + edge : Math.max(0, edge * 2));
    call = clamp(30 + edge * 3 - raise * 0.35);
    fold = 100 - raise - call;
  }
  if (fold < 0) { call += fold; fold = 0; }
  const total = fold + call + raise || 1;
  const recommendation = { fold: Math.round(fold / total * 100), call: Math.round(call / total * 100), raise: 0 };
  recommendation.raise = 100 - recommendation.fold - recommendation.call;
  const actual = preflop.find((a) => a.player === input.hero)?.type;
  const actualKey = actual === "fold" ? "fold" : actual === "raise" ? "raise" : "call";
  const score = recommendation[actualKey];
  const best = Object.entries(recommendation).sort((a, b) => b[1] - a[1])[0][0];
  const ja = { fold: "フォールド", call: "コール", raise: "レイズ" } as const;
  const bigBlind = input.bigBlind ?? 100;
  const facingSizeBb = raisesBeforeHero.length
    ? (raisesBeforeHero.at(-1)?.toAmount ?? raisesBeforeHero.at(-1)?.amount ?? 0) / bigBlind
    : 0;
  const context = {
    model: "baseline" as const,
    tableSize: input.tableSize,
    effectiveStackBb: input.effectiveStackBb ?? 100,
    anteBb: input.anteBb ?? 0,
    position: input.position,
    facing: raisesBeforeHero.length > 1 ? "reraise" as const
      : raisesBeforeHero.length ? "raise" as const
      : callsBeforeHero.length ? "limp" as const
      : "unopened" as const,
    facingSizeBb,
  };
  return {
    recommendation,
    score,
    issue: score < 50 ? `${input.tableSize}人卓・${input.position}の基準レンジとの差` : undefined,
    explanation: `${input.tableSize}人卓・100BBの基準では、このハンドは${ja[best as keyof typeof ja]}が中心です。${facingRaise ? "先行レイズに対するディフェンスレンジ" : "未オープン時の参加レンジ"}として評価しています。`,
    source: `${input.tableSize}人卓・${context.effectiveStackBb}BB・アンティ${context.anteBb}BBの基準戦略（簡易モデル）`,
    context,
  };
}
