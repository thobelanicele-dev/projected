import type { JournalEntry } from "@/app/lib/journal";

// Everything on the dashboard beyond the basic journal stats: the time filter,
// the equity curve and its biggest drop, streaks, averages, and the breakdowns
// of what's working. Pure functions over the journal, worked out in the browser.

export type Period = "7d" | "30d" | "90d" | "all";

export const PERIODS: { key: Period; label: string; phrase: string; days: number | null }[] = [
  { key: "7d", label: "7 days", phrase: "the last 7 days", days: 7 },
  { key: "30d", label: "30 days", phrase: "the last 30 days", days: 30 },
  { key: "90d", label: "90 days", phrase: "the last 90 days", days: 90 },
  { key: "all", label: "All time", phrase: "all your trades", days: null },
];

const DAY_MS = 24 * 60 * 60 * 1000;
/** A group needs at least this many trades before its average means much. */
export const MIN_SAMPLE = 3;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function numeric(n: number | undefined | null): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** "+1.5R" / "-0.4R". */
export function formatR(n: number): string {
  const v = round2(n);
  return `${v >= 0 ? "+" : ""}${v}R`;
}

/** When a trade "happened" for filtering: closed trades by when they closed, the rest by when they were made. */
function eventTime(e: JournalEntry): number {
  return e.status === "closed" ? (e.closedAt ?? e.createdAt) : e.createdAt;
}

export function periodStart(period: Period, now: number): number | null {
  const days = PERIODS.find((p) => p.key === period)?.days ?? null;
  return days === null ? null : now - days * DAY_MS;
}

export function filterByPeriod(entries: JournalEntry[], period: Period, now: number): JournalEntry[] {
  const start = periodStart(period, now);
  return start === null ? entries : entries.filter((e) => eventTime(e) >= start && eventTime(e) <= now);
}

function closedWithR(entries: JournalEntry[]): (JournalEntry & { rMultiple: number })[] {
  return entries
    .filter((e): e is JournalEntry & { rMultiple: number } => e.status === "closed" && numeric(e.rMultiple))
    .sort((a, b) => eventTime(a) - eventTime(b) || a.id.localeCompare(b.id));
}

/* ---------------------------------------------------------------- headline */

export function periodHeadline(entries: JournalEntry[], period: Period): string {
  const phrase = PERIODS.find((p) => p.key === period)!.phrase;
  const trades = closedWithR(entries);
  if (trades.length === 0) return `No closed trades with a result in ${phrase}.`;
  const total = round2(trades.reduce((sum, t) => sum + t.rMultiple, 0));
  const count = `${trades.length} trade${trades.length === 1 ? "" : "s"}`;
  if (total === 0) return `Flat over ${phrase}, across ${count}.`;
  return `${total > 0 ? "Up" : "Down"} ${Math.abs(total)}R over ${phrase}, across ${count}.`;
}

/* ------------------------------------------------------------ equity curve */

export interface EquityPoint {
  id: string;
  ts: number;
  instrument: string;
  direction: "long" | "short";
  r: number;
  cumR: number;
  /** This trade's profit in money, if the trader entered one. */
  money: number | null;
  /** Running money total (only trades with a profit figure add to it). */
  cumMoney: number | null;
}

export interface Drawdown {
  /** How far it fell from the peak, as a positive number (in R or money). */
  depth: number;
  /** Index of the peak point; -1 means the start, before the first trade. */
  peakIndex: number;
  troughIndex: number;
}

export interface EquityCurveData {
  points: EquityPoint[];
  /** How many of the trades have a money figure. */
  moneyCount: number;
  drawdownR: Drawdown | null;
  drawdownMoney: Drawdown | null;
}

/** Largest fall from a running peak. The curve starts at zero, so a losing start counts too. */
export function maxDrawdown(values: number[]): Drawdown | null {
  let peak = 0;
  let peakIndex = -1;
  let worst: Drawdown | null = null;
  values.forEach((v, i) => {
    if (v > peak) {
      peak = v;
      peakIndex = i;
    }
    const depth = round2(peak - v);
    if (depth > 0 && (worst === null || depth > worst.depth)) {
      worst = { depth, peakIndex, troughIndex: i };
    }
  });
  return worst;
}

export function computeEquityCurve(entries: JournalEntry[]): EquityCurveData {
  const trades = closedWithR(entries);
  let cumR = 0;
  let cumMoney = 0;
  let moneyCount = 0;

  const points: EquityPoint[] = trades.map((t) => {
    cumR = round2(cumR + t.rMultiple);
    const money = numeric(t.profitAmount) ? t.profitAmount : null;
    if (money !== null) {
      cumMoney = round2(cumMoney + money);
      moneyCount += 1;
    }
    return {
      id: t.id,
      ts: eventTime(t),
      instrument: t.instrument,
      direction: t.direction,
      r: t.rMultiple,
      cumR,
      money,
      cumMoney: moneyCount > 0 ? cumMoney : null,
    };
  });

  const moneySeries = points.map((p) => p.cumMoney ?? 0);
  return {
    points,
    moneyCount,
    drawdownR: maxDrawdown(points.map((p) => p.cumR)),
    drawdownMoney: moneyCount > 0 ? maxDrawdown(moneySeries) : null,
  };
}

/* ------------------------------------------------------------- consistency */

export interface Consistency {
  tradeCount: number;
  winCount: number;
  lossCount: number;
  avgWinR: number | null;
  avgLossR: number | null;
  /** Total won divided by total lost; null when there are no losses (or no wins) to compare. */
  profitFactor: number | null;
  longestWinStreak: number;
  longestLossStreak: number;
  current: { type: "win" | "loss"; length: number } | null;
}

export function computeConsistency(entries: JournalEntry[]): Consistency {
  const trades = closedWithR(entries);
  const wins = trades.filter((t) => t.rMultiple > 0);
  const losses = trades.filter((t) => t.rMultiple < 0);
  const sumWins = wins.reduce((s, t) => s + t.rMultiple, 0);
  const sumLosses = losses.reduce((s, t) => s + t.rMultiple, 0);

  let longestWin = 0;
  let longestLoss = 0;
  let run: { type: "win" | "loss"; length: number } | null = null;
  for (const t of trades) {
    const type = t.rMultiple > 0 ? "win" : t.rMultiple < 0 ? "loss" : null;
    if (type === null) {
      run = null; // a breakeven ends a streak
      continue;
    }
    run = run && run.type === type ? { type, length: run.length + 1 } : { type, length: 1 };
    if (type === "win") longestWin = Math.max(longestWin, run.length);
    else longestLoss = Math.max(longestLoss, run.length);
  }

  return {
    tradeCount: trades.length,
    winCount: wins.length,
    lossCount: losses.length,
    avgWinR: wins.length > 0 ? round2(sumWins / wins.length) : null,
    avgLossR: losses.length > 0 ? round2(sumLosses / losses.length) : null,
    profitFactor: wins.length > 0 && losses.length > 0 ? round2(sumWins / Math.abs(sumLosses)) : null,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    current: run,
  };
}

/* -------------------------------------------------------------- breakdowns */

export interface GroupRow {
  key: string;
  trades: number;
  totalR: number;
  avgR: number;
  winRate: number | null;
}

function groupBy(
  trades: (JournalEntry & { rMultiple: number })[],
  keyOf: (e: JournalEntry) => string
): GroupRow[] {
  const groups = new Map<string, (JournalEntry & { rMultiple: number })[]>();
  for (const t of trades) groups.set(keyOf(t), [...(groups.get(keyOf(t)) ?? []), t]);

  return [...groups.entries()]
    .map(([key, list]) => {
      const total = round2(list.reduce((s, t) => s + t.rMultiple, 0));
      const wins = list.filter((t) => t.rMultiple > 0).length;
      const losses = list.filter((t) => t.rMultiple < 0).length;
      return {
        key,
        trades: list.length,
        totalR: total,
        avgR: round2(total / list.length),
        winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
      };
    })
    .sort((a, b) => b.totalR - a.totalR);
}

export function breakdownByInstrument(entries: JournalEntry[]): GroupRow[] {
  return groupBy(closedWithR(entries), (e) => e.instrument);
}

export function breakdownByDirection(entries: JournalEntry[]): GroupRow[] {
  return groupBy(closedWithR(entries), (e) => (e.direction === "long" ? "Long" : "Short"));
}

export interface DisciplineSplit {
  passed: { trades: number; avgR: number | null };
  broke: { trades: number; avgR: number | null };
}

/** Planner trades that cleared every rule check versus ones that broke at least one. */
export function computeDisciplineSplit(entries: JournalEntry[]): DisciplineSplit {
  const withPlan = closedWithR(entries).filter((e) => e.plan && e.plan.ruleChecks.length > 0);
  const passed = withPlan.filter((e) => e.plan!.ruleChecks.every((c) => c.passed));
  const broke = withPlan.filter((e) => e.plan!.ruleChecks.some((c) => !c.passed));
  const avg = (list: typeof withPlan) =>
    list.length > 0 ? round2(list.reduce((s, t) => s + t.rMultiple, 0) / list.length) : null;

  return {
    passed: { trades: passed.length, avgR: avg(passed) },
    broke: { trades: broke.length, avgR: avg(broke) },
  };
}
