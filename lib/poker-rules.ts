import { HandAction, Position } from "./types";

const streets = ["preflop", "flop", "turn", "river"] as const;

function blindOwner(position: Position, blind: "SB" | "BB") {
  return position === blind ? "Hero" : blind;
}

export function calculatePot(actions: HandAction[], heroPosition: Position) {
  let total = 150;

  for (const street of streets) {
    const rows = actions.filter((action) => action.street === street);
    total += rows.reduce((sum, action) => sum + (action.amount ?? 0), 0);

    // A bet that is not called is returned to the bettor and is not part of the pot.
    if (rows.at(-1)?.type === "fold") {
      const paid = new Map<string, number>();
      if (street === "preflop") {
        paid.set(blindOwner(heroPosition, "SB"), 50);
        paid.set(blindOwner(heroPosition, "BB"), 100);
      }
      for (const action of rows) {
        paid.set(action.player, (paid.get(action.player) ?? 0) + (action.amount ?? 0));
      }
      const levels = [...paid.values()].sort((a, b) => b - a);
      if (levels.length > 1) total -= Math.max(0, levels[0] - levels[1]);
    }
  }

  return total;
}

export function validateHoldemActions(actions: HandAction[], heroPosition: Position) {
  const errors: string[] = [];
  const folded = new Set<string>();

  for (const street of streets) {
    const rows = actions.filter((action) => action.street === street);
    const paid = new Map<string, number>();
    let currentBet = 0;

    if (street === "preflop") {
      paid.set(blindOwner(heroPosition, "SB"), 50);
      paid.set(blindOwner(heroPosition, "BB"), 100);
      currentBet = 100;
    }

    rows.forEach((action, index) => {
      if (folded.has(action.player)) errors.push(`${street} ${index + 1}: folded player acted again`);

      const before = paid.get(action.player) ?? 0;
      const after = before + (action.amount ?? 0);
      if (action.type === "check" && before < currentBet) errors.push(`${street} ${index + 1}: illegal check`);
      if (action.type === "bet" && currentBet > 0) errors.push(`${street} ${index + 1}: bet used instead of raise`);
      if (action.type === "call" && after !== currentBet) errors.push(`${street} ${index + 1}: incorrect call amount`);
      if (action.type === "raise" && after <= currentBet) errors.push(`${street} ${index + 1}: raise does not increase the bet`);

      if (action.type === "fold") {
        folded.add(action.player);
      } else {
        paid.set(action.player, after);
        if (action.type === "bet" || action.type === "raise") currentBet = after;
      }
    });
  }

  return errors;
}

export type PlayerCommitment = {
  player: string;
  committed: number;
  folded?: boolean;
};

export type SidePot = {
  amount: number;
  eligible: string[];
};

/** Builds main/side pots from total hand commitments. Folded chips stay in pots,
 * but folded players can never win them. */
export function buildSidePots(players: PlayerCommitment[]): SidePot[] {
  const levels = [...new Set(players.map((p) => p.committed).filter((n) => n > 0))].sort((a, b) => a - b);
  let previous = 0;
  const pots: SidePot[] = [];
  for (const level of levels) {
    const contributors = players.filter((p) => p.committed >= level);
    const amount = (level - previous) * contributors.length;
    if (amount > 0) {
      pots.push({
        amount,
        eligible: contributors.filter((p) => !p.folded).map((p) => p.player),
      });
    }
    previous = level;
  }
  return pots;
}

export function splitPot(amount: number, winners: string[], seatOrder: string[]) {
  if (!winners.length) throw new Error("A pot must have at least one winner");
  const base = Math.floor(amount / winners.length);
  let odd = amount - base * winners.length;
  const ordered = seatOrder.filter((player) => winners.includes(player));
  return Object.fromEntries(ordered.map((player) => [player, base + (odd-- > 0 ? 1 : 0)]));
}

export type HoldemAuditOptions = {
  players: string[];
  heroPosition?: Position;
  initialStreetCommitments?: Partial<Record<string, number>>;
  stacks?: Partial<Record<string, number>>;
};

export type HoldemAudit = {
  valid: boolean;
  errors: string[];
  folded: string[];
  allIn: string[];
  streetClosed: Partial<Record<HandAction["street"], boolean>>;
  lastLivePlayers: string[];
};

/** Audits normalized actions. `amount` is the increment paid by this action and
 * `toAmount` is the player's total contribution on the current street. */
export function auditHoldemActions(actions: HandAction[], options: HoldemAuditOptions): HoldemAudit {
  const errors: string[] = [];
  const folded = new Set<string>();
  const allIn = new Set<string>();
  const totalPaid = new Map(options.players.map((p) => [p, 0]));
  const streetClosed: HoldemAudit["streetClosed"] = {};

  for (const street of streets) {
    const rows = actions.filter((action) => action.street === street);
    const streetPaid = new Map(options.players.map((p) => [p, 0]));
    if (street === "preflop") {
      for (const [player, amount] of Object.entries(options.initialStreetCommitments ?? {})) {
        streetPaid.set(player, amount ?? 0);
        totalPaid.set(player, (totalPaid.get(player) ?? 0) + (amount ?? 0));
      }
    }
    let currentBet = Math.max(0, ...streetPaid.values());
    let lastFullRaise = currentBet;
    const actedSinceRaise = new Set<string>();

    rows.forEach((action, index) => {
      const label = `${street} ${index + 1}`;
      if (!options.players.includes(action.player)) errors.push(`${label}: unknown player ${action.player}`);
      if (folded.has(action.player)) errors.push(`${label}: folded player acted again`);
      if (allIn.has(action.player)) errors.push(`${label}: all-in player acted again`);

      const before = streetPaid.get(action.player) ?? 0;
      const increment = action.amount ?? Math.max(0, (action.toAmount ?? before) - before);
      const after = action.toAmount ?? before + increment;
      const toCall = Math.max(0, currentBet - before);

      if (increment < 0 || after < before) errors.push(`${label}: negative commitment`);
      if (action.type === "check" && toCall > 0) errors.push(`${label}: cannot check facing ${toCall}`);
      if (action.type === "bet" && currentBet > 0) errors.push(`${label}: bet must be represented as raise`);
      if (action.type === "call" && after !== currentBet) errors.push(`${label}: call must match ${currentBet}`);
      if (action.type === "raise") {
        if (after <= currentBet) errors.push(`${label}: raise must exceed ${currentBet}`);
        const raiseSize = after - currentBet;
        const stack = options.stacks?.[action.player];
        const isAllInRaise = stack !== undefined && (totalPaid.get(action.player) ?? 0) + increment >= stack;
        if (currentBet > 0 && raiseSize < lastFullRaise && !isAllInRaise) {
          errors.push(`${label}: raise below minimum ${currentBet + lastFullRaise}`);
        }
        if (raiseSize >= lastFullRaise) lastFullRaise = raiseSize;
        currentBet = after;
        actedSinceRaise.clear();
      } else if (action.type === "bet") {
        currentBet = after;
        lastFullRaise = after;
        actedSinceRaise.clear();
      }

      if (action.type === "fold") folded.add(action.player);
      else {
        streetPaid.set(action.player, after);
        totalPaid.set(action.player, (totalPaid.get(action.player) ?? 0) + increment);
        const stack = options.stacks?.[action.player];
        if (stack !== undefined && (totalPaid.get(action.player) ?? 0) >= stack) allIn.add(action.player);
      }
      actedSinceRaise.add(action.player);
    });

    const live = options.players.filter((p) => !folded.has(p));
    const canAct = live.filter((p) => !allIn.has(p));
    const matched = canAct.every((p) => (streetPaid.get(p) ?? 0) === currentBet);
    streetClosed[street] = live.length <= 1 || canAct.length <= 1 || (matched && canAct.every((p) => actedSinceRaise.has(p)));

    const laterStreetHasAction = streets.slice(streets.indexOf(street) + 1).some((next) => actions.some((a) => a.street === next));
    if (laterStreetHasAction && !streetClosed[street]) errors.push(`${street}: advanced before betting round closed`);
    if (live.length <= 1 && laterStreetHasAction) errors.push(`${street}: action continued after everyone else folded`);
  }

  return {
    valid: errors.length === 0,
    errors,
    folded: [...folded],
    allIn: [...allIn],
    streetClosed,
    lastLivePlayers: options.players.filter((p) => !folded.has(p)),
  };
}
