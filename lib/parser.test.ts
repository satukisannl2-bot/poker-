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

describe("GGPoker text hand history compatibility", () => {
  it("parses each hand, actual seats, hero cards, position, board and actions", async () => {
    const history = `Poker Hand #TM6219737427: Tournament #300468440, Bounty Hunters Special $2.50 [7-Max] Hold'em No Limit - Level1(50/100(15)) - 2026/07/25 20:38:26
Table '60' 7-max Seat #7 is the button
Seat 1: P1 (10,130 in chips)
Seat 3: P3 (9,555 in chips)
Seat 4: P4 (9,170 in chips)
Seat 5: Hero (10,045 in chips)
Seat 6: P6 (11,385 in chips)
Seat 7: P7 (9,820 in chips)
Hero: posts the ante 15
P1: posts small blind 50
P3: posts big blind 100
*** HOLE CARDS ***
Dealt to P1
Dealt to P3
Dealt to P4
Dealt to Hero [Kc Js]
Dealt to P6
Dealt to P7
P4: raises 100 to 200
Hero: calls 200
P6: folds
P7: calls 200
P1: folds
P3: folds
*** FLOP *** [Qs Th 8h]
P4: bets 420
Hero: calls 420
P7: folds
*** TURN *** [Qs Th 8h] [9h]
P4: checks
Hero: checks
*** RIVER *** [Qs Th 8h 9h] [4h]
*** SHOWDOWN ***
Hero collected 1,500 from pot
*** SUMMARY ***
Total pot 1,500 | Rake 0
Board [Qs Th 8h 9h 4h]`;
    const hands = await parsePokerCraftFile(new File([history], "gg.txt", { type: "text/plain" }));
    expect(hands).toHaveLength(1);
    expect(hands[0]).toMatchObject({
      id: "TM6219737427",
      tableSize: 6,
      hero: "Hero",
      position: "HJ",
      holeCards: ["K♣", "J♠"],
      board: ["Q♠", "T♥", "8♥", "9♥", "4♥"],
      pot: 1500,
    });
    expect(hands[0].actions.map((action) => [action.street, action.player, action.type])).toContainEqual(["preflop", "Hero", "call"]);
    expect(hands[0].actions.map((action) => [action.street, action.player, action.type])).toContainEqual(["flop", "UTG", "bet"]);
    expect(hands[0].actions.some((action) => /^P\d+$/.test(action.player))).toBe(false);
  });
});
