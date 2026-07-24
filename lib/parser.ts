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

export async function parsePokerCraftFile(file: File): Promise<Hand[]> {
  const text = await file.text();
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
