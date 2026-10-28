import type { JournalEntry } from "@/app/lib/journal";

// Everything here is worked out in the trader's own browser from their journal,
// which never leaves their device. Weeks run Monday to Sunday in local time.

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export interface DaySummary {
  index: number; // 0 = Monday
  name: string;
  date: number; // ms, local midnight of that day
  trades: number;
  wins: number;
  losses: number;
  totalR: number;
  pnl: number | null;
}

export interface TradeRef {
  id: string;
  instrument: string;
  direction: "long" | "short";
  rMultiple: number;
}

export interface WeeklyInsight {
  id: string;
  tone: "improve" | "good";
  title: string;
  detail: string;
}

export interface PeriodStats {
  closedTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number | null;
  totalR: number;
  avgR: number | null;
  pnl: number | null;
  pnlTradeCount: number;
}

export interface WeeklySummary extends PeriodStats {
  weekStart: number;
  weekEnd: number; // the following Monday
  plansBuilt: number;
  /** Closed this week but with no result (R) logged, so they're missing from the totals. */
  missingResultCount: number;
  /** Plans built this week that were never marked taken or closed. */
  unfinishedPlans: number;
  days: DaySummary[];
  bestDay: DaySummary | null;
  worstDay: DaySummary | null;
  bestTrade: TradeRef | null;
  worstTrade: TradeRef | null;
  ruleAdherence: { plans: number; compliant: number; rate: number | null };
  topBiasFlags: { flag: string; count: number }[];
  previous: PeriodStats | null;
  insights: WeeklyInsight[];
}

export interface WeekdayRecord {
  index: number;
  name: string;
  trades: number;
  avgR: number;
  winRate: number | null;
}

export interface BestDayToTrade {
  /** Closed trades with a logged result that were counted. */
  tradesCounted: number;
  /** How many closed trades are needed before this means anything. */
  tradesNeeded: number;
  ready: boolean;
  best: WeekdayRecord | null;
  worst: WeekdayRecord | null;
  byDay: WeekdayRecord[];
}

const MIN_TRADES_OVERALL = 12;
const MIN_TRADES_PER_DAY = 3;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "+1.5R" / "-0.4R". */
export function formatR(n: number): string {
  const v = round2(n);
  return `${v >= 0 ? "+" : ""}${v}R`;
}

/** Local midnight of the Monday that starts the week containing `date`. */
export function startOfWeek(date: Date | number): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Moves a Monday by whole weeks without being thrown off by clocks changing. */
export function addWeeks(weekStart: number, weeks: number): number {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + weeks * 7);
  return d.getTime();
}

function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

function weekdayIndex(ts: number): number {
  return (new Date(ts).getDay() + 6) % 7;
}

/** e.g. "19 Oct to 25 Oct 2026". */
export function formatWeekRange(weekStart: number): string {
  const start = new Date(weekStart);
  const end = new Date(addDays(weekStart, 6));
  const short = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  return `${short.format(start)} to ${short.format(end)} ${end.getFullYear()}`;
}

function closeTime(e: JournalEntry): number {
  return e.closedAt ?? e.createdAt;
}

function inRange(ts: number, start: number, end: number): boolean {
  return ts >= start && ts < end;
}

function numeric(n: number | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function periodStats(trades: JournalEntry[]): PeriodStats {
  const wins = trades.filter((e) => e.outcome === "win").length;
  const losses = trades.filter((e) => e.outcome === "loss").length;
  const breakevens = trades.filter((e) => e.outcome === "breakeven").length;
  const rs = trades.map((e) => e.rMultiple).filter(numeric);
  const profits = trades.map((e) => e.profitAmount).filter(numeric);
  const totalR = round2(rs.reduce((a, b) => a + b, 0));

  return {
    closedTrades: trades.length,
    wins,
    losses,
    breakevens,
    winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
    totalR,
    avgR: rs.length > 0 ? round2(totalR / rs.length) : null,
    pnl: profits.length > 0 ? round2(profits.reduce((a, b) => a + b, 0)) : null,
    pnlTradeCount: profits.length,
  };
}

function averageR(trades: JournalEntry[]): number | null {
  const rs = trades.map((e) => e.rMultiple).filter(numeric);
  return rs.length > 0 ? round2(rs.reduce((a, b) => a + b, 0) / rs.length) : null;
}

function closedBetween(entries: JournalEntry[], start: number, end: number): JournalEntry[] {
  return entries.filter((e) => e.status === "closed" && inRange(closeTime(e), start, end));
}

export function computeWeeklySummary(entries: JournalEntry[], weekStart: number): WeeklySummary {
  const weekEnd = addWeeks(weekStart, 1);
  const closed = closedBetween(entries, weekStart, weekEnd);
  const planned = entries.filter(
    (e) => e.source === "planner" && e.plan && inRange(e.createdAt, weekStart, weekEnd)
  );
  const stats = periodStats(closed);

  const previousClosed = closedBetween(entries, addWeeks(weekStart, -1), weekStart);
  const previous = previousClosed.length > 0 ? periodStats(previousClosed) : null;

  // Day by day
  const days: DaySummary[] = WEEKDAYS.map((name, index) => {
    const date = addDays(weekStart, index);
    const trades = closed.filter((e) => weekdayIndex(closeTime(e)) === index);
    const s = periodStats(trades);
    return { index, name, date, trades: trades.length, wins: s.wins, losses: s.losses, totalR: s.totalR, pnl: s.pnl };
  });
  const tradedDays = days.filter((d) => d.trades > 0);
  const bestCandidate = [...tradedDays].sort((a, b) => b.totalR - a.totalR)[0];
  const worstCandidate = [...tradedDays].sort((a, b) => a.totalR - b.totalR)[0];
  const bestDay = bestCandidate && bestCandidate.totalR > 0 ? bestCandidate : null;
  const worstDay = worstCandidate && worstCandidate.totalR < 0 ? worstCandidate : null;

  // Best and worst single trades
  const withR: TradeRef[] = closed
    .filter((e): e is JournalEntry & { rMultiple: number } => numeric(e.rMultiple))
    .map((e) => ({ id: e.id, instrument: e.instrument, direction: e.direction, rMultiple: e.rMultiple }));
  const byR = [...withR].sort((a, b) => b.rMultiple - a.rMultiple);
  const bestTrade = byR[0] && byR[0].rMultiple > 0 ? byR[0] : null;
  const worstTrade = byR.length > 0 && byR[byR.length - 1].rMultiple < 0 ? byR[byR.length - 1] : null;

  // Discipline: did the plans built this week pass the rule checks?
  const checked = planned.filter((e) => e.plan!.ruleChecks.length > 0);
  const compliant = checked.filter((e) => e.plan!.ruleChecks.every((c) => c.passed));
  const ruleAdherence = {
    plans: checked.length,
    compliant: compliant.length,
    rate: checked.length > 0 ? Math.round((compliant.length / checked.length) * 100) : null,
  };
  const failedRules = new Map<string, number>();
  for (const e of checked) {
    for (const c of e.plan!.ruleChecks) {
      if (!c.passed) failedRules.set(c.rule, (failedRules.get(c.rule) ?? 0) + 1);
    }
  }

  const flagCounts = new Map<string, { flag: string; count: number }>();
  for (const e of planned) {
    for (const f of e.plan!.biasFlags) {
      const key = f.flag.trim().toLowerCase();
      const existing = flagCounts.get(key);
      if (existing) existing.count += 1;
      else flagCounts.set(key, { flag: f.flag.trim(), count: 1 });
    }
  }
  const topBiasFlags = [...flagCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  const missingResultCount = closed.filter((e) => !numeric(e.rMultiple)).length;
  const unfinishedPlans = planned.filter((e) => e.status === "planned").length;

  const summary: WeeklySummary = {
    ...stats,
    weekStart,
    weekEnd,
    plansBuilt: planned.length,
    missingResultCount,
    unfinishedPlans,
    days,
    bestDay,
    worstDay,
    bestTrade,
    worstTrade,
    ruleAdherence,
    topBiasFlags,
    previous,
    insights: [],
  };

  summary.insights = buildInsights(summary, closed, failedRules);
  return summary;
}

const MAX_IMPROVE = 4;
const MAX_GOOD = 3;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function buildInsights(
  s: WeeklySummary,
  closed: JournalEntry[],
  failedRules: Map<string, number>
): WeeklyInsight[] {
  const improve: WeeklyInsight[] = [];
  const good: WeeklyInsight[] = [];

  // Overtrading: lots of trades in one day, and they lost money on average.
  const busy = s.days
    .filter((d) => d.trades >= 4)
    .map((d) => ({ d, avg: averageR(closed.filter((e) => weekdayIndex(closeTime(e)) === d.index)) }))
    .filter((x) => x.avg !== null && x.avg < 0)
    .sort((a, b) => (a.avg as number) - (b.avg as number))[0];
  if (busy) {
    improve.push({
      id: "overtrading",
      tone: "improve",
      title: `Too many trades on ${busy.d.name}`,
      detail: `You closed ${busy.d.trades} trades that day and they averaged ${formatR(busy.avg as number)}. More trades isn't better trades. A daily limit can stop a bad day from snowballing.`,
    });
  }

  // The costliest day.
  const tough = [...s.days].filter((d) => d.trades >= 2 && d.totalR < 0).sort((a, b) => a.totalR - b.totalR)[0];
  if (tough && tough.index !== busy?.d.index) {
    improve.push({
      id: "worst-day",
      tone: "improve",
      title: `${tough.name} was your toughest day`,
      detail: `${plural(tough.trades, "trade")} closed for ${formatR(tough.totalR)} in total. Look back at them for a pattern: time of day, news, or how you were feeling.`,
    });
  }

  // Did breaking the plan's own rules cost you?
  const planTrades = closed.filter((e) => e.plan && e.plan.ruleChecks.length > 0 && numeric(e.rMultiple));
  const failedTrades = planTrades.filter((e) => e.plan!.ruleChecks.some((c) => !c.passed));
  const cleanTrades = planTrades.filter((e) => e.plan!.ruleChecks.every((c) => c.passed));
  const failedAvg = averageR(failedTrades);
  const cleanAvg = averageR(cleanTrades);
  if (failedTrades.length >= 2 && cleanTrades.length >= 2 && failedAvg !== null && cleanAvg !== null && failedAvg < cleanAvg) {
    improve.push({
      id: "rules-vs-results",
      tone: "improve",
      title: "Trades that broke a rule did worse",
      detail: `Trades that failed at least one rule check averaged ${formatR(failedAvg)}, against ${formatR(cleanAvg)} for the ones that passed every check.`,
    });
  } else if (s.ruleAdherence.plans >= 2 && s.ruleAdherence.rate !== null && s.ruleAdherence.rate < 70) {
    const [topRule] = [...failedRules.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    improve.push({
      id: "rule-adherence",
      tone: "improve",
      title: "Plans are breaking the rule checks",
      detail: `Only ${s.ruleAdherence.compliant} of ${s.ruleAdherence.plans} plans passed every check.${topRule ? ` The one that failed most: ${topRule.toLowerCase()}.` : ""} Fix those before you take the trade.`,
    });
  }

  // A bias the planner kept spotting.
  const flag = s.topBiasFlags[0];
  if (flag && flag.count >= 2) {
    improve.push({
      id: "bias",
      tone: "improve",
      title: `"${flag.flag}" keeps showing up`,
      detail: `The planner flagged it in ${flag.count} of this week's plans. Spotting it is the first step; before your next trade, ask yourself whether it's driving the decision.`,
    });
  }

  // Finishing short of the plan.
  const gaps = closed
    .filter((e) => e.plan && numeric(e.plan.riskRewardRatio ?? undefined) && numeric(e.rMultiple))
    .map((e) => (e.rMultiple as number) - (e.plan!.riskRewardRatio as number));
  if (gaps.length >= 2) {
    const avgGap = round2(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (avgGap <= -0.3) {
      improve.push({
        id: "short-of-plan",
        tone: "improve",
        title: "Trades finished short of the plan",
        detail: `On average they ended ${formatR(avgGap)} away from what the plan aimed for. Check whether you're exiting early or moving your stop.`,
      });
    }
  }

  // An instrument that keeps losing.
  const perInstrument = new Map<string, JournalEntry[]>();
  for (const e of closed) perInstrument.set(e.instrument, [...(perInstrument.get(e.instrument) ?? []), e]);
  const losingMarket = [...perInstrument.entries()]
    .map(([instrument, trades]) => ({ instrument, trades, totalR: round2(trades.map((t) => t.rMultiple).filter(numeric).reduce((a, b) => a + b, 0)) }))
    .filter((m) => m.trades.length >= 2 && m.totalR < 0)
    .sort((a, b) => a.totalR - b.totalR)[0];
  if (losingMarket) {
    improve.push({
      id: "market",
      tone: "improve",
      title: `${losingMarket.instrument} is costing you`,
      detail: `${plural(losingMarket.trades.length, "trade")} for ${formatR(losingMarket.totalR)} in total. It may be worth trading it less, or smaller, until you understand why.`,
    });
  }

  // Housekeeping that makes the numbers trustworthy.
  if (s.missingResultCount > 0 || s.unfinishedPlans > 0) {
    const parts: string[] = [];
    if (s.missingResultCount > 0) parts.push(`${plural(s.missingResultCount, "closed trade")} ${s.missingResultCount === 1 ? "has" : "have"} no result logged, so ${s.missingResultCount === 1 ? "it's" : "they're"} missing from the totals`);
    if (s.unfinishedPlans > 0) parts.push(`${plural(s.unfinishedPlans, "plan")} from this week ${s.unfinishedPlans === 1 ? "was" : "were"} never marked as taken or closed`);
    improve.push({
      id: "housekeeping",
      tone: "improve",
      title: "Finish logging your trades",
      detail: `${parts.join(", and ")}. This summary is only as good as your journal.`,
    });
  }

  // What went well.
  if (s.closedTrades >= 2 && s.totalR > 0) {
    good.push({
      id: "profitable-week",
      tone: "good",
      title: "A profitable week",
      detail: `${formatR(s.totalR)} across ${plural(s.closedTrades, "closed trade")}.`,
    });
  }
  if (s.previous && s.closedTrades > 0 && s.totalR - s.previous.totalR >= 1) {
    good.push({
      id: "better-than-last-week",
      tone: "good",
      title: "Better than last week",
      detail: `Up ${formatR(round2(s.totalR - s.previous.totalR))} on the week before.`,
    });
  }
  if (s.ruleAdherence.plans >= 2 && s.ruleAdherence.rate === 100) {
    good.push({
      id: "clean-plans",
      tone: "good",
      title: "Every plan passed every check",
      detail: `All ${s.ruleAdherence.plans} plans you built this week cleared the rule checks. That's the habit that lasts.`,
    });
  }
  if (s.bestTrade) {
    good.push({
      id: "best-trade",
      tone: "good",
      title: "Your best trade",
      detail: `${s.bestTrade.instrument} ${s.bestTrade.direction}, ${formatR(s.bestTrade.rMultiple)}.`,
    });
  }

  return [...improve.slice(0, MAX_IMPROVE), ...good.slice(0, MAX_GOOD)];
}

/**
 * Which weekday has historically been best for this trader, from all their
 * closed trades. A day needs a few trades behind it before it can be called
 * best or worst, because one lucky trade says nothing.
 */
export function computeBestDayToTrade(entries: JournalEntry[]): BestDayToTrade {
  const counted = entries.filter((e) => e.status === "closed" && numeric(e.rMultiple));
  const byDay: WeekdayRecord[] = WEEKDAYS.map((name, index) => {
    const trades = counted.filter((e) => weekdayIndex(closeTime(e)) === index);
    const wins = trades.filter((e) => e.outcome === "win").length;
    const losses = trades.filter((e) => e.outcome === "loss").length;
    return {
      index,
      name,
      trades: trades.length,
      avgR: averageR(trades) ?? 0,
      winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
    };
  });

  const ready = counted.length >= MIN_TRADES_OVERALL;
  const eligible = byDay.filter((d) => d.trades >= MIN_TRADES_PER_DAY);
  const sorted = [...eligible].sort((a, b) => b.avgR - a.avgR);
  const best = ready && sorted.length > 0 ? sorted[0] : null;
  const worst = ready && sorted.length >= 2 ? sorted[sorted.length - 1] : null;

  return { tradesCounted: counted.length, tradesNeeded: MIN_TRADES_OVERALL, ready, best, worst, byDay };
}

/** A plain-text version of the week, for copying into notes or a message. */
export function buildSummaryText(s: WeeklySummary): string {
  const lines = [`My trading week: ${formatWeekRange(s.weekStart)}`, ""];
  lines.push(`Closed trades: ${s.closedTrades}`);
  if (s.winRate !== null) lines.push(`Win rate: ${s.winRate}%`);
  lines.push(`Result: ${formatR(s.totalR)}`);
  if (s.pnl !== null) lines.push(`Profit / loss: ${s.pnl >= 0 ? "+" : ""}${s.pnl}`);
  if (s.bestDay) lines.push(`Best day: ${s.bestDay.name} (${formatR(s.bestDay.totalR)})`);
  const improve = s.insights.filter((i) => i.tone === "improve");
  const good = s.insights.filter((i) => i.tone === "good");
  if (good.length > 0) lines.push("", "Went well:", ...good.map((i) => `- ${i.title}: ${i.detail}`));
  if (improve.length > 0) lines.push("", "To improve:", ...improve.map((i) => `- ${i.title}: ${i.detail}`));
  return lines.join("\n");
}
