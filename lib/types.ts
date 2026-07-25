export type Position = "UTG" | "UTG+1" | "MP" | "MP+1" | "HJ" | "CO" | "BTN" | "SB" | "BB";
export type ActionType = "fold" | "call" | "raise" | "check" | "bet";

export type HandAction = { street: "preflop" | "flop" | "turn" | "river"; player: string; type: ActionType; amount?: number; toAmount?: number };
export type Hand = {
  id: string; playedAt: string; game: string; stakes: string; hero: string; position: Position;
  holeCards: string[]; board: string[]; pot: number; result: number; actions: HandAction[];
  actualAction: "Fold" | "Call" | "Raise"; recommendation: { fold: number; call: number; raise: number };
  score: number; issue?: string; explanation?: string;
  tableSize?: number; seatPositions?: Position[]; rangeSource?: string;
  strategyContext?: {
    model: "baseline";
    tableSize: number;
    effectiveStackBb: number;
    anteBb: number;
    position: Position;
    facing: "unopened" | "limp" | "raise" | "reraise";
    facingSizeBb: number;
  };
};

export type Stats = {
  hands: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  cbet: number;
  cbetOpportunities: number;
  foldToCbet: number;
  foldToCbetOpportunities: number;
  net: number;
  netBb: number;
  winRateBb100: number;
  averageScore: number;
};
export type PositionStat = { position: Position; hands: number; bb100: number; vpip: number; pfr: number };
