import type { Candle } from "@/app/lib/backtestEngine";
import { stripBom, parseCsvLine, matchHeader, parseLocaleNumber, parseFlexibleDate } from "@/app/lib/csvUtils";

const FIELD_ALIASES: Record<string, string[]> = {
  date: ["date", "datetime", "date/time", "time"],
  open: ["open", "open price"],
  high: ["high"],
  low: ["low"],
  close: ["close", "close price", "closing price", "last"],
};

export interface CandleImportResult {
  candles: Candle[];
  skippedCount: number;
}

export function parseCandleCsv(rawText: string): CandleImportResult {
  const text = stripBom(rawText);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { candles: [], skippedCount: 0 };

  const headers = parseCsvLine(lines[0]);
  const indices = Object.fromEntries(
    Object.entries(FIELD_ALIASES).map(([key, aliases]) => [key, matchHeader(headers, aliases)])
  );

  const candles: Candle[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);

    const dateRaw = indices.date !== -1 ? cells[indices.date] : "";
    const openRaw = indices.open !== -1 ? cells[indices.open] : "";
    const highRaw = indices.high !== -1 ? cells[indices.high] : "";
    const lowRaw = indices.low !== -1 ? cells[indices.low] : "";
    const closeRaw = indices.close !== -1 ? cells[indices.close] : "";

    const dateMs = dateRaw ? parseFlexibleDate(dateRaw) : null;
    const open = openRaw ? parseLocaleNumber(openRaw) : null;
    const high = highRaw ? parseLocaleNumber(highRaw) : null;
    const low = lowRaw ? parseLocaleNumber(lowRaw) : null;
    const close = closeRaw ? parseLocaleNumber(closeRaw) : null;

    if (dateMs === null || open === null || high === null || low === null || close === null) {
      skipped++;
      continue;
    }

    candles.push({
      date: new Date(dateMs).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
    });
  }

  candles.sort((a, b) => a.date.localeCompare(b.date));

  return { candles, skippedCount: skipped };
}
