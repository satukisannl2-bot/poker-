import { describe, expect, it } from "vitest";
import { parseCsvRows, parsePokerCraftFile } from "./parser";

describe("PokerCraft CSV compatibility", () => {
  it("keeps empty columns, escaped quotes and line breaks inside quoted cells", () => {
    expect(parseCsvRows('id,note,result\r\n1,"a, ""quoted"" note",\r\n2,"two\r\nlines",10')).toEqual([
      ["id","note","result"],
      ["1",'a, "quoted" note',""],
      ["2","two\r\nlines","10"],
    ]);
  });

  it("detects table size and all five board cards from split street columns", async () => {
    const csv = [
      "handId,game,playerCount,hero,position,holeCards,flop,turn,river,actions",
      'PC-1,NL Holdem,7,Hero,HJ,A♠ K♠,2♣ 3♦ 4♥,5♠,6♣,"preflop:UTG:fold;preflop:UTG+1:fold;preflop:MP:fold;preflop:Hero:raise:300:300;preflop:CO:fold;preflop:BTN:fold;preflop:SB:fold;preflop:BB:call:200:300"',
    ].join("\n");
    const hands = await parsePokerCraftFile(new File([csv], "pokercraft.csv", { type:"text/csv" }));
    expect(hands[0].tableSize).toBe(7);
    expect(hands[0].seatPositions).toHaveLength(7);
    expect(hands[0].board).toEqual(["2♣","3♦","4♥","5♠","6♣"]);
    expect(hands[0].strategyContext?.tableSize).toBe(7);
  });
});
