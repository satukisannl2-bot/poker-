import { describe, expect, it } from "vitest";
import { calculateStats } from "./analyzer";
import { Hand, HandAction } from "./types";

function hand(actions: HandAction[]): Hand {
  return {
    id: crypto.randomUUID(),
    playedAt: "2026-07-25 12:00",
    game: "6-Max NL Hold'em",
    stakes: "50 / 100",
    hero: "Hero",
    position: "BB",
    holeCards: ["A♠", "K♠"],
    board: ["2♣", "7♦", "J♥"],
    pot: 1000,
    result: 0,
    actions,
    actualAction: "Call",
    recommendation: { fold: 0, call: 100, raise: 0 },
    score: 100,
  };
}

describe("Fold to CBET", () => {
  it("counts a fold when Hero faces the preflop aggressor's first flop bet", () => {
    const stats = calculateStats([hand([
      { street: "preflop", player: "BTN", type: "raise", amount: 250 },
      { street: "preflop", player: "Hero", type: "call", amount: 150 },
      { street: "flop", player: "Hero", type: "check" },
      { street: "flop", player: "BTN", type: "bet", amount: 300 },
      { street: "flop", player: "Hero", type: "fold" },
    ])]);
    expect(stats.foldToCbetOpportunities).toBe(1);
    expect(stats.foldToCbet).toBe(100);
  });

  it("counts a call as an opportunity but not a fold", () => {
    const stats = calculateStats([hand([
      { street: "preflop", player: "CO", type: "raise", amount: 250 },
      { street: "preflop", player: "Hero", type: "call", amount: 150 },
      { street: "flop", player: "Hero", type: "check" },
      { street: "flop", player: "CO", type: "bet", amount: 300 },
      { street: "flop", player: "Hero", type: "call", amount: 300 },
    ])]);
    expect(stats.foldToCbetOpportunities).toBe(1);
    expect(stats.foldToCbet).toBe(0);
  });

  it("does not count a donk-bet pot as a CBET opportunity", () => {
    const stats = calculateStats([hand([
      { street: "preflop", player: "BTN", type: "raise", amount: 250 },
      { street: "preflop", player: "Hero", type: "call", amount: 150 },
      { street: "flop", player: "Hero", type: "bet", amount: 300 },
      { street: "flop", player: "BTN", type: "call", amount: 300 },
    ])]);
    expect(stats.foldToCbetOpportunities).toBe(0);
  });

  it("does not turn zero opportunities into a misleading percentage", () => {
    const stats = calculateStats([hand([
      { street: "preflop", player: "Hero", type: "raise", amount: 300 },
      { street: "preflop", player: "BTN", type: "fold" },
    ])]);
    expect(stats.foldToCbetOpportunities).toBe(0);
    expect(stats.foldToCbet).toBe(0);
  });
});
