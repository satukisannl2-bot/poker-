import { describe, expect, it } from "vitest";
import { getPreflopGtoBaseline, positionsForTable } from "./gto-ranges";
import { buildSidePots } from "./poker-rules";
import { createPracticeDeal, simpleStrength } from "./practice-game";

const CASES = 10_000;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe(`10,000-case randomized regression`, () => {
  it(`validates ${CASES.toLocaleString()} deals, evaluations, pots and strategy outputs`, () => {
    const originalRandom = Math.random;
    const random = seededRandom(0x52495645);
    Math.random = random;

    try {
      for (let caseNo = 1; caseNo <= CASES; caseNo++) {
        const tableSize = 2 + Math.floor(random() * 8);
        const deal = createPracticeDeal(tableSize, caseNo);
        const positions = positionsForTable(tableSize);

        expect(deal.positions).toEqual(positions);
        expect(new Set(deal.positions).size).toBe(tableSize);
        expect(deal.positions.at(-2)).toBe("SB");
        expect(deal.positions.at(-1)).toBe("BB");

        const allCards = [
          ...deal.heroCards,
          ...Object.values(deal.botCards).flat(),
          ...deal.board,
        ];
        expect(allCards).toHaveLength(tableSize * 2 + 5);
        expect(new Set(allCards).size).toBe(allCards.length);

        const sevenCards = [...deal.heroCards, ...deal.board];
        const shuffled = [...sevenCards].sort(() => random() - 0.5);
        expect(simpleStrength(shuffled)).toBe(simpleStrength(sevenCards));

        const commitments = positions.map((player) => ({
          player,
          committed: Math.floor(random() * 101) * 100,
          folded: random() < 0.35,
        }));
        if (commitments.every((p) => p.folded)) commitments[0].folded = false;
        const pots = buildSidePots(commitments);
        expect(pots.reduce((sum, pot) => sum + pot.amount, 0))
          .toBe(commitments.reduce((sum, player) => sum + player.committed, 0));
        expect(pots.every((pot) => pot.amount > 0 && pot.eligible.every(
          (player) => !commitments.find((row) => row.player === player)?.folded,
        ))).toBe(true);

        const recommendation = getPreflopGtoBaseline({
          cards: deal.heroCards,
          position: deal.heroPosition,
          tableSize,
          actions: [],
          hero: "Hero",
          effectiveStackBb: 10 + Math.floor(random() * 191),
          anteBb: random() < 0.5 ? 0 : 0.125,
        });
        const frequencies = recommendation.recommendation;
        expect(frequencies.fold + frequencies.call + frequencies.raise).toBe(100);
        expect(Object.values(frequencies).every((value) => value >= 0 && value <= 100)).toBe(true);
        expect(recommendation.score).toBeGreaterThanOrEqual(0);
        expect(recommendation.score).toBeLessThanOrEqual(100);
      }
    } finally {
      Math.random = originalRandom;
    }
  }, 120_000);
});
