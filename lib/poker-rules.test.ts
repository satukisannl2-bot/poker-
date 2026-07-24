import { describe, expect, it } from "vitest";
import { auditHoldemActions, buildSidePots, splitPot } from "./poker-rules";
import { compareHoldemHands, simpleStrength } from "./practice-game";
import { positionsForTable } from "./gto-ranges";

describe("seat layouts", () => {
  it.each([2,3,4,5,6,7,8,9])("creates a valid %i-handed layout", (size) => {
    const positions = positionsForTable(size);
    expect(positions).toHaveLength(size);
    expect(new Set(positions).size).toBe(size);
    expect(positions.at(-2)).toBe("SB");
    expect(positions.at(-1)).toBe("BB");
  });
});

describe("betting action audit", () => {
  const players = ["BTN", "SB", "BB"];
  const blinds = { SB: 50, BB: 100 };

  it("rejects action after folding", () => {
    const result = auditHoldemActions([
      { street:"preflop", player:"BTN", type:"fold" },
      { street:"preflop", player:"BTN", type:"call", amount:100, toAmount:100 },
    ], { players, initialStreetCommitments:blinds });
    expect(result.errors.some((e) => e.includes("folded player acted again"))).toBe(true);
  });

  it("rejects check facing a bet or raise", () => {
    const result = auditHoldemActions([
      { street:"preflop", player:"BTN", type:"raise", amount:300, toAmount:300 },
      { street:"preflop", player:"SB", type:"check" },
    ], { players, initialStreetCommitments:blinds });
    expect(result.errors.some((e) => e.includes("cannot check"))).toBe(true);
  });

  it("accepts a completed raise/call round and permits the flop", () => {
    const result = auditHoldemActions([
      { street:"preflop", player:"BTN", type:"raise", amount:300, toAmount:300 },
      { street:"preflop", player:"SB", type:"fold" },
      { street:"preflop", player:"BB", type:"call", amount:200, toAmount:300 },
      { street:"flop", player:"BB", type:"check" },
      { street:"flop", player:"BTN", type:"check" },
    ], { players, initialStreetCommitments:blinds });
    expect(result.errors).toEqual([]);
    expect(result.streetClosed.preflop).toBe(true);
  });

  it("stops once only one live player remains", () => {
    const result = auditHoldemActions([
      { street:"preflop", player:"BTN", type:"raise", amount:300, toAmount:300 },
      { street:"preflop", player:"SB", type:"fold" },
      { street:"preflop", player:"BB", type:"fold" },
      { street:"flop", player:"BTN", type:"check" },
    ], { players, initialStreetCommitments:blinds });
    expect(result.errors.some((e) => e.includes("everyone else folded"))).toBe(true);
  });

  it("does not let an all-in player act again", () => {
    const result = auditHoldemActions([
      { street:"preflop", player:"BTN", type:"raise", amount:1000, toAmount:1000 },
      { street:"preflop", player:"SB", type:"fold" },
      { street:"preflop", player:"BB", type:"call", amount:900, toAmount:1000 },
      { street:"flop", player:"BTN", type:"check" },
    ], { players, initialStreetCommitments:blinds, stacks:{ BTN:1000, SB:1000, BB:1000 } });
    expect(result.errors.some((e) => e.includes("all-in player acted again"))).toBe(true);
  });
});

describe("pots", () => {
  it("builds a main pot and side pots while excluding folded players from eligibility", () => {
    expect(buildSidePots([
      { player:"A", committed:1000 },
      { player:"B", committed:600 },
      { player:"C", committed:300, folded:true },
    ])).toEqual([
      { amount:900, eligible:["A","B"] },
      { amount:600, eligible:["A","B"] },
      { amount:400, eligible:["A"] },
    ]);
  });

  it("splits odd chips by seat order", () => {
    expect(splitPot(101, ["A","C"], ["C","B","A"])).toEqual({ C:51, A:50 });
  });
});

describe("hand ranking and ties", () => {
  it("orders straight, flush and full house correctly", () => {
    const straight = simpleStrength(["9♠","8♥","7♦","6♣","5♠"]);
    const flush = simpleStrength(["A♠","J♠","8♠","4♠","2♠"]);
    const fullHouse = simpleStrength(["K♠","K♥","K♦","2♣","2♠"]);
    expect(flush).toBeGreaterThan(straight);
    expect(fullHouse).toBeGreaterThan(flush);
  });

  it("supports wheel straights", () => {
    const wheel = simpleStrength(["A♠","2♥","3♦","4♣","5♠"]);
    const trips = simpleStrength(["K♠","K♥","K♦","8♣","2♠"]);
    expect(wheel).toBeGreaterThan(trips);
  });

  it("returns every tied winner", () => {
    expect(compareHoldemHands(
      { A:["2♠","3♠"], B:["2♥","3♥"] },
      ["A♣","K♦","Q♠","J♥","T♣"],
    )).toEqual(["A","B"]);
  });
});
