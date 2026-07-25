import { getPreflopGtoBaseline, positionsForTable } from "./gto-ranges";
import { Hand, HandAction, Position } from "./types";

export function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim()); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim()); field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field.length || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}
const validPositions: Position[] = ["UTG", "UTG+1", "MP", "MP+1", "HJ", "CO", "BTN", "SB", "BB"];
const parseCards = (value: string) => value.match(/(?:10|[2-9TJQKA])[♠♥♦♣shdc]/gi)?.map((c) => c.replace(/10/i, "T")) ?? [];
const suitSymbol: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const parseGgCards = (value: string) =>
  [...value.matchAll(/(?:10|[2-9TJQKA])([shdc])/gi)].map((match) => {
    const raw = match[0].replace(/10/i, "T");
    return `${raw.slice(0, -1).toUpperCase()}${suitSymbol[raw.slice(-1).toLowerCase()]}`;
  });
const normalizePosition = (value: string): Position => {
  const raw = value.toUpperCase().replace(/\s/g, "").replace("MP1", "MP+1");
  return validPositions.includes(raw as Position) ? raw as Position : "BTN";
};

function parseActions(value: string): HandAction[] {
  if (!value) return [];
  try {
    const raw = JSON.parse(value);
    if (Array.isArray(raw)) return raw.filter((a) => a.street && a.player && a.type).map((a) => ({ ...a, amount: a.amount ? Number(a.amount) : undefined, toAmount: a.toAmount ? Number(a.toAmount) : undefined }));
  } catch {}
  return value.split(/[;|]/).map((part) => part.trim().split(/[:>]/)).filter((x) => x.length >= 3).map(([street, player, type, amount, toAmount]) => ({
    street: street.toLowerCase() as HandAction["street"], player, type: type.toLowerCase() as HandAction["type"],
    amount: amount ? Number(amount) : undefined, toAmount: toAmount ? Number(toAmount) : undefined,
  }));
}

function detectTableSize(explicit: string, game: string, actions: HandAction[]) {
  const explicitNumber = Number(explicit.match(/[2-9]/)?.[0]);
  if (explicitNumber >= 2 && explicitNumber <= 9) return explicitNumber;
  const gameNumber = Number(game.match(/([2-9])\s*(?:-|\s)?(?:max|handed|人)/i)?.[1]);
  if (gameNumber >= 2 && gameNumber <= 9) return gameNumber;
  const players = new Set(actions.filter((a) => a.street === "preflop").map((a) => a.player));
  if (players.size >= 2) return Math.min(9, players.size);
  return 8;
}

const numberFrom = (value: string) => Number(value.replace(/,/g, ""));
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function positionMapForSeats(seats: { seat: number; player: string }[], buttonSeat: number) {
  const sorted = [...seats].sort((a, b) => a.seat - b.seat);
  const buttonIndex = sorted.findIndex((seat) => seat.seat === buttonSeat);
  const clockwise = buttonIndex >= 0 ? [...sorted.slice(buttonIndex), ...sorted.slice(0, buttonIndex)] : sorted;
  const byPlayer = new Map<string, Position>();
  if (sorted.length === 2) {
    byPlayer.set(clockwise[0].player, "SB");
    byPlayer.set(clockwise[1].player, "BB");
    return byPlayer;
  }
  const positions = positionsForTable(sorted.length);
  const afterButton = [...clockwise.slice(1), clockwise[0]];
  const orderedPositions: Position[] = ["SB", "BB", ...positions.filter((position) => !["BTN", "SB", "BB"].includes(position)), "BTN"];
  afterButton.forEach((seat, index) => byPlayer.set(seat.player, orderedPositions[index]));
  return byPlayer;
}

function parseGgHand(block: string, index: number): Hand | null {
  const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = lines[0] ?? "";
  const id = header.match(/^Poker Hand #([^:]+)/)?.[1] ?? `GG-${index + 1}`;
  const playedAt = header.match(/-\s*(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})$/)?.[1]?.replace(/\//g, "-") ?? new Date().toLocaleString("ja-JP");
  const level = header.match(/Level[^(]*\(([\d,]+)\/([\d,]+)(?:\(([\d,]+)\))?\)/i);
  const smallBlind = level ? numberFrom(level[1]) : 0;
  const bigBlind = level ? numberFrom(level[2]) : 100;
  const ante = level?.[3] ? numberFrom(level[3]) : 0;
  const buttonSeat = Number(block.match(/Seat #(\d+) is the button/i)?.[1] ?? 0);
  const seats = lines.flatMap((line) => {
    const match = line.match(/^Seat (\d+): (.+?) \(([\d,]+) in chips\)$/);
    return match ? [{ seat: Number(match[1]), player: match[2] }] : [];
  });
  if (seats.length < 2) return null;
  const tableSize = seats.length;
  const positionByPlayer = positionMapForSeats(seats, buttonSeat);
  const dealtLine = lines.find((line) => /^Dealt to .+ \[[^\]]+\]$/.test(line));
  const hero = dealtLine?.match(/^Dealt to (.+?) \[/)?.[1] ?? "Hero";
  const holeCards = parseGgCards(dealtLine ?? "");
  if (holeCards.length !== 2) return null;

  let street: HandAction["street"] = "preflop";
  const actions: HandAction[] = [];
  const committed = new Map<string, number>();
  let inActions = false;
  for (const line of lines) {
    if (line === "*** HOLE CARDS ***") { inActions = true; street = "preflop"; continue; }
    if (line.startsWith("*** FLOP ***")) { street = "flop"; committed.clear(); continue; }
    if (line.startsWith("*** TURN ***")) { street = "turn"; committed.clear(); continue; }
    if (line.startsWith("*** RIVER ***")) { street = "river"; committed.clear(); continue; }
    if (line.startsWith("*** SUMMARY ***")) break;
    const blind = line.match(/^(.+?): posts (small|big) blind ([\d,]+)/);
    if (blind) committed.set(blind[1], numberFrom(blind[3]));
    if (!inActions || line.startsWith("Dealt to ") || line.startsWith("Uncalled bet") || line.includes(": shows ")) continue;
    const match = line.match(/^(.+?): (folds|checks|calls [\d,]+|bets [\d,]+|raises [\d,]+ to [\d,]+)/);
    if (!match) continue;
    const player = match[1], phrase = match[2], paid = committed.get(player) ?? 0;
    if (phrase === "folds") actions.push({ street, player, type: "fold" });
    else if (phrase === "checks") actions.push({ street, player, type: "check" });
    else if (phrase.startsWith("calls")) {
      const amount = numberFrom(phrase.match(/calls ([\d,]+)/)![1]), toAmount = paid + amount;
      committed.set(player, toAmount);
      actions.push({ street, player, type: "call", amount, toAmount });
    } else if (phrase.startsWith("bets")) {
      const amount = numberFrom(phrase.match(/bets ([\d,]+)/)![1]);
      committed.set(player, amount);
      actions.push({ street, player, type: "bet", amount, toAmount: amount });
    } else {
      const toAmount = numberFrom(phrase.match(/to ([\d,]+)/)![1]), amount = Math.max(0, toAmount - paid);
      committed.set(player, toAmount);
      actions.push({ street, player, type: "raise", amount, toAmount });
    }
  }

  const boardText = block.match(/^Board \[([^\]]+)\]/m)?.[1] ?? [
    block.match(/\*\*\* FLOP \*\*\* \[([^\]]+)\]/)?.[1],
    block.match(/\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/)?.[1],
    block.match(/\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/)?.[1],
  ].filter(Boolean).join(" ");
  const board = parseGgCards(boardText);
  const pot = numberFrom(block.match(/^Total pot ([\d,]+)/m)?.[1] ?? "0");
  const heroPattern = escapeRegExp(hero);
  const won = [...block.matchAll(new RegExp(`^${heroPattern} collected ([\\d,]+) from pot`, "gm"))]
    .reduce((sum, match) => sum + numberFrom(match[1]), 0);
  const posted = lines.filter((line) => line.startsWith(`${hero}: posts `)).reduce((sum, line) => {
    const amount = line.match(/([\d,]+)$/)?.[1];
    return sum + (amount ? numberFrom(amount) : 0);
  }, 0);
  const returned = numberFrom(block.match(new RegExp(`Uncalled bet \\(([\\d,]+)\\) returned to ${heroPattern}`))?.[1] ?? "0");
  const actionCost = actions.filter((action) => action.player === hero).reduce((sum, action) => sum + (action.amount ?? 0), 0);
  const result = won + returned - posted - actionCost;
  const position = positionByPlayer.get(hero) ?? "BTN";
  const actual = actions.find((action) => action.player === hero && action.street === "preflop");
  const actualAction = actual?.type === "raise" ? "Raise" : actual?.type === "fold" ? "Fold" : "Call";
  const gto = getPreflopGtoBaseline({
    cards: holeCards, position, tableSize, actions, hero,
    effectiveStackBb: 100, anteBb: ante / bigBlind, bigBlind,
  });
  return {
    id, playedAt, game: `${tableSize}-Max Tournament NL Hold'em`, stakes: `${smallBlind} / ${bigBlind}`,
    hero, position, tableSize, seatPositions: positionsForTable(tableSize), holeCards, board, pot, result, actions, actualAction,
    recommendation: gto.recommendation, score: gto.score, issue: gto.issue, explanation: gto.explanation,
    rangeSource: gto.source, strategyContext: gto.context,
  };
}

function parseGgText(text: string) {
  return text.split(/(?=^Poker Hand #)/m)
    .map((block, index) => parseGgHand(block.trim(), index))
    .filter((hand): hand is Hand => Boolean(hand));
}

export async function parsePokerCraftFile(file: File): Promise<Hand[]> {
  const text = await file.text();
  if (/^Poker Hand #/m.test(text)) {
    const hands = parseGgText(text.replace(/^\uFEFF/, ""));
    if (!hands.length) throw new Error("GGPokerのハンド履歴を解析できませんでした。");
    return hands;
  }
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("データ行が見つかりませんでした");
  const headers = rows[0].map((h) => h.toLowerCase().replace(/[ _-]/g, ""));
  const find = (row: string[], names: string[]) => { const i = headers.findIndex((h) => names.includes(h)); return i >= 0 ? row[i] : ""; };

  return rows.slice(1).map((row, index) => {
    const hero = find(row, ["hero", "heroname", "playername"]) || "Hero";
    const result = Number(find(row, ["result", "net", "winloss"]) || 0);
    const position = normalizePosition(find(row, ["position", "pos"]));
    const holeCards = parseCards(find(row, ["holecards", "cards", "hand"])).slice(0, 2);
    const boardValue = find(row, ["board", "communitycards"]) || [find(row, ["flop"]), find(row, ["turn"]), find(row, ["river"])].join(" ");
    const board = parseCards(boardValue).slice(0, 5);
    const actions = parseActions(find(row, ["actions", "actionhistory", "handhistory"]));
    const game = find(row, ["game", "gametype"]) || "NL Hold’em";
    const tableSize = detectTableSize(find(row, ["playercount", "players", "seats", "tablesize", "maxplayers"]), game, actions);
    const seatPositions = positionsForTable(tableSize);
    const actual = actions.find((a) => a.player === hero && a.street === "preflop") ?? actions.find((a) => a.player === "Hero" && a.street === "preflop");
    const actualAction = actual?.type === "raise" ? "Raise" : actual?.type === "fold" ? "Fold" : "Call";
    const gto = getPreflopGtoBaseline({ cards: holeCards, position, tableSize, actions, hero: actual?.player ?? hero });
    return {
      id: find(row, ["handid", "handno", "id"]) || `IMPORT-${index + 1}`,
      playedAt: find(row, ["date", "datetime", "playedat"]) || new Date().toLocaleString("ja-JP"),
      game: `${tableSize}-Max ${game.replace(/[2-9]\s*(?:-|\s)?max/i, "").trim()}`, stakes: find(row, ["stakes", "blind"]) || "—", hero,
      position, tableSize, seatPositions, holeCards: holeCards.length ? holeCards : ["A♠", "K♠"], board,
      pot: Number(find(row, ["pot", "potsize"]) || actions.reduce((s, a) => s + (a.amount || 0), 0)), result, actions, actualAction,
      recommendation: gto.recommendation, score: gto.score, issue: gto.issue, explanation: gto.explanation, rangeSource: gto.source,
      strategyContext: gto.context,
    } satisfies Hand;
  });
}
