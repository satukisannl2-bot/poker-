import { describe,expect,it } from "vitest";
import { describeCards,estimateDecision } from "./decision-analysis";

describe("decision analysis",()=>{
 it("detects made hands, draws and board texture",()=>{
  const result=describeCards(["A♠","K♠"],["Q♠","J♦","2♠"]);
  expect(result.draws).toContain("フラッシュドロー");
  expect(result.boardTexture).toContain("連結性が高い");
 });
 it("returns conserved frequencies and ranked bet sizes in heads-up",()=>{
  const result=estimateDecision({hole:["A♠","A♥"],board:["K♣","7♦","2♠"],opponents:1,pot:650,toCall:0,stack:9000,samples:300});
  expect(result.frequencies.fold+result.frequencies.call+result.frequencies.raise).toBe(100);
  expect(result.betSizes[0].estimatedEv).toBeGreaterThanOrEqual(result.betSizes.at(-1)!.estimatedEv);
  expect(result.confidence).toBe("medium");
 });
 it("supports multiway estimates and marks lower confidence",()=>{
  const result=estimateDecision({hole:["9♠","8♠"],board:["T♣","7♦","2♠"],opponents:4,pot:2000,toCall:500,stack:7000,samples:300});
  expect(result.equity).toBeGreaterThanOrEqual(0);
  expect(result.equity).toBeLessThanOrEqual(100);
  expect(result.confidence).toBe("low");
 });
});
