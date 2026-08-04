import type { JournalEntry } from "@/app/lib/journal";
import { stripBom, parseCsvLine, matchHeader, parseLocaleNumber, parseFlexibleDate } from "@/app/lib/csvUtils";

const FIELD_ALIASES: Record<string, string[]> = {
  symbol: ["symbol", "item", "instrument", "pair", "ticker"],
  direction: ["type", "side", "direction", "action"],
  entryPrice: ["open price", "entry price", "price open", "entry", "openprice", "price"],
  exitPrice: ["close price", "exit price", "price close", "exit", "closeprice"],
  entryTime: ["open time", "entry time", "date/time", "opentime", "date opened", "time"],
  exitTime: ["close time", "exit time", "closetime", "date closed"],
  stopLoss: ["s/l", "sl", "stop loss", "stoploss"],
  profit: ["profit", "p/l", "pnl", "net profit", "p&l", "gain"],
};

export interface ParsedTradeRow {
  raw: Record<string, string>;
  symbol: string | null;
  direction: "long" | "short" | null;
  entryPrice: number | null;
  exitPrice: number | null;
  entryTime: number | null;
  exitTime: number | null;
  stopLoss: number | null;
  profit: number | null;
  valid: boolean;
}

export interface ImportResult {
  rows: ParsedTradeRow[];
  validCount: number;
  skippedCount: number;
}

function normalizeSymbol(raw: string): string {
  let s = raw.trim().toUpperCase();
  if (s.includes(":")) s = s.split(":").pop() || s;
  if (s.includes("/")) return s;
  if (/^[A-Z]{6}$/.test(s)) return `${s.slice(0, 3)}/${s.slice(3)}`;
  return s;
}

function normalizeDirection(raw: string): "long" | "short" | null {
  const s = raw.trim().toLowerCase();
  if (s === "long" || s === "b" || s.startsWith("buy")) return "long";
  if (s === "short" || s === "s" || s.startsWith("sell")) return "short";
  return null;
}

const FOOTER_KEYWORDS = [
  "balance",
  "credit",
  "deposit",
  "withdrawal",
  "total",
  "closed p/l",
  "floating p/l",
  "equity",
  "margin",
];

function looksLikeFooterRow(symbolRaw: string): boolean {
  const s = symbolRaw.trim().toLowerCase();
  return FOOTER_KEYWORDS.some((k) => s.includes(k));
}

export function parseTradeCsv(rawText: string): ImportResult {
  const text = stripBom(rawText);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], validCount: 0, skippedCount: 0 };

  const headers = parseCsvLine(lines[0]);
  const indices = Object.fromEntries(
    Object.entries(FIELD_ALIASES).map(([key, aliases]) => [key, matchHeader(headers, aliases)])
  );

  const rows: ParsedTradeRow[] = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const raw = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));

    const symbolRaw = indices.symbol !== -1 ? cells[indices.symbol] : "";
    const directionRaw = indices.direction !== -1 ? cells[indices.direction] : "";
    const entryPriceRaw = indices.entryPrice !== -1 ? cells[indices.entryPrice] : "";
    const exitPriceRaw = indices.exitPrice !== -1 ? cells[indices.exitPrice] : "";
    const entryTimeRaw = indices.entryTime !== -1 ? cells[indices.entryTime] : "";
    const exitTimeRaw = indices.exitTime !== -1 ? cells[indices.exitTime] : "";
    const stopLossRaw = indices.stopLoss !== -1 ? cells[indices.stopLoss] : "";
    const profitRaw = indices.profit !== -1 ? cells[indices.profit] : "";

    const symbol = symbolRaw ? normalizeSymbol(symbolRaw) : null;
    const direction = directionRaw ? normalizeDirection(directionRaw) : null;
    const entryPrice = entryPriceRaw ? parseLocaleNumber(entryPriceRaw) : null;
    const exitPrice = exitPriceRaw ? parseLocaleNumber(exitPriceRaw) : null;
    const entryTime = entryTimeRaw ? parseFlexibleDate(entryTimeRaw) : null;
    const exitTime = exitTimeRaw ? parseFlexibleDate(exitTimeRaw) : null;
    const stopLoss = stopLossRaw ? parseLocaleNumber(stopLossRaw) : null;
    const profit = profitRaw ? parseLocaleNumber(profitRaw) : null;

    const valid =
      !looksLikeFooterRow(symbolRaw) &&
      symbol !== null &&
      direction !== null &&
      (entryPrice !== null || exitPrice !== null);

    return { raw, symbol, direction, entryPrice, exitPrice, entryTime, exitTime, stopLoss, profit, valid };
  });

  const validCount = rows.filter((r) => r.valid).length;
  return { rows, validCount, skippedCount: rows.length - validCount };
}

export function rowsToJournalEntries(rows: ParsedTradeRow[]): JournalEntry[] {
  return rows
    .filter((r) => r.valid && r.symbol && r.direction)
    .map((r) => {
      const outcome: JournalEntry["outcome"] =
        r.profit === null ? undefined : r.profit > 0 ? "win" : r.profit < 0 ? "loss" : "breakeven";

      let rMultiple: number | undefined;
      if (r.entryPrice !== null && r.exitPrice !== null && r.stopLoss !== null) {
        const risk = Math.abs(r.entryPrice - r.stopLoss);
        if (risk > 0) {
          const reward =
            r.direction === "long" ? r.exitPrice - r.entryPrice : r.entryPrice - r.exitPrice;
          rMultiple = Math.round((reward / risk) * 100) / 100;
        }
      }

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: r.entryTime ?? Date.now(),
        source: "imported",
        instrument: r.symbol!,
        direction: r.direction!,
        stopLossPrice: r.stopLoss ?? undefined,
        status: "closed",
        outcome,
        actualEntryPrice: r.entryPrice ?? undefined,
        actualExitPrice: r.exitPrice ?? undefined,
        rMultiple,
        profitAmount: r.profit ?? undefined,
        closedAt: r.exitTime ?? r.entryTime ?? Date.now(),
      } satisfies JournalEntry;
    });
}
