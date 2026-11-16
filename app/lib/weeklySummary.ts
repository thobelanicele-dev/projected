import type { JournalEntry } from "@/app/lib/journal";

// Everything here is worked out in the trader's own browser from their journal,
// which never leaves their device. Weeks run Monday to Sunday in local time.
//
// The same summary works for a week, a calendar month, a calendar year, or any
// two dates the trader picks. The file keeps its "weekly" name because the week
// came first.

export type PeriodKind = "week" | "month" | "year" | "custom";

/** The stretch of time a summary covers. `end` is the first moment after it. */
export interface SummaryPeriod {
  kind: PeriodKind;
  start: number;
  end: number;
}

/** What one bar in the chart stands for. */
export type BucketUnit = "day" | "week" | "month" | "year";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export interface DaySummary {
  index: number; // position in its list; in a week, 0 = Monday
  name: string;
  /** A shorter label for under a chart bar. Left out when the first three letters of `name` will do. */
  short?: string;
  date: number; // ms, local midnight of the day (or of the first day of a longer bar)
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
  period: SummaryPeriod;
  /** Same as period.start and period.end; kept from when this only did weeks. */
  weekStart: number;
  weekEnd: number;
  plansBuilt: number;
  /** Closed this week but with no result (R) logged, so they're missing from the totals. */
  missingResultCount: number;
  /** Plans built this week that were never marked taken or closed. */
  unfinishedPlans: number;
  /** In a week: Monday to Sunday. In anything longer: each day that had a closed trade. */
  days: DaySummary[];
  /** The bars for the chart: days in a week, weeks in a month, months in a year. */
  buckets: DaySummary[];
  bucketUnit: BucketUnit;
  bestBucketIndex: number | null;
  bestDay: DaySummary | null;
  worstDay: DaySummary | null;
  bestTrade: TradeRef | null;
  worstTrade: TradeRef | null;
  ruleAdherence: { plans: number; compliant: number; rate: number | null };
  topBiasFlags: { flag: string; count: number }[];
  previous: PeriodStats | null;
  insights: WeeklyInsight[];
}

/** A summary of any period. Named for the week, which came first. */
export type PeriodSummary = WeeklySummary;

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

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + months, 1).getTime();
}

function startOfYear(ts: number): number {
  return new Date(new Date(ts).getFullYear(), 0, 1).getTime();
}

function addYears(ts: number, years: number): number {
  return new Date(new Date(ts).getFullYear() + years, 0, 1).getTime();
}

/** Whole days in a period. Rounded, so a day made 23 or 25 hours long by the clocks changing still counts as one. */
function daysIn(period: SummaryPeriod): number {
  return Math.max(1, Math.round((period.end - period.start) / 86_400_000));
}

/** The Monday-to-Sunday week that `date` falls in. */
export function weekPeriod(date: Date | number): SummaryPeriod {
  const start = startOfWeek(date);
  return { kind: "week", start, end: addWeeks(start, 1) };
}

/** The calendar month that `date` falls in. */
export function monthPeriod(date: Date | number): SummaryPeriod {
  const start = startOfMonth(new Date(date).getTime());
  return { kind: "month", start, end: addMonths(start, 1) };
}

/** The calendar year that `date` falls in. */
export function yearPeriod(date: Date | number): SummaryPeriod {
  const start = startOfYear(new Date(date).getTime());
  return { kind: "year", start, end: addYears(start, 1) };
}

/** From one day to another, both included. The two can be given in either order. */
export function customPeriod(fromDay: Date | number, toDay: Date | number): SummaryPeriod {
  const a = startOfDay(new Date(fromDay).getTime());
  const b = startOfDay(new Date(toDay).getTime());
  return { kind: "custom", start: Math.min(a, b), end: addDays(Math.max(a, b), 1) };
}

/** The same kind of period, `steps` earlier (negative) or later. A custom period moves by its own length. */
export function shiftPeriod(period: SummaryPeriod, steps: number): SummaryPeriod {
  switch (period.kind) {
    case "week":
      return weekPeriod(addWeeks(period.start, steps));
    case "month":
      return monthPeriod(addMonths(period.start, steps));
    case "year":
      return yearPeriod(addYears(period.start, steps));
    case "custom": {
      const length = daysIn(period);
      const start = addDays(period.start, steps * length);
      return { kind: "custom", start, end: addDays(start, length) };
    }
  }
}

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const WEEKDAY_DAY_MONTH = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", { month: "short" });

/** "19 Oct to 25 Oct 2026", "November 2026", "2026", or "3 Nov 2026 to 16 Nov 2026". */
export function formatPeriodRange(period: SummaryPeriod): string {
  switch (period.kind) {
    case "week":
      return formatWeekRange(period.start);
    case "month":
      return MONTH_YEAR.format(period.start);
    case "year":
      return String(new Date(period.start).getFullYear());
    case "custom": {
      const last = addDays(period.end, -1);
      return last === period.start
        ? DAY_MONTH_YEAR.format(period.start)
        : `${DAY_MONTH_YEAR.format(period.start)} to ${DAY_MONTH_YEAR.format(last)}`;
    }
  }
}

export interface PeriodWords {
  /** "week", "month", "year", "period". */
  noun: string;
  /** As in "nothing closed this week" / "nothing closed in this period". */
  during: string;
  /** As in "plans from this week" / "plans from this period". */
  thisOne: string;
  /** As in "this week's plans". */
  possessive: string;
  /** As in "up on last week" / "up on the period before". */
  last: string;
  /** A label for the earlier period's number: "Last week" / "Period before". */
  lastLabel: string;
  /** As in "up on the week before". */
  before: string;
}

const PERIOD_WORDS: Record<PeriodKind, PeriodWords> = {
  week: {
    noun: "week",
    during: "this week",
    thisOne: "this week",
    possessive: "this week's",
    last: "last week",
    lastLabel: "Last week",
    before: "the week before",
  },
  month: {
    noun: "month",
    during: "this month",
    thisOne: "this month",
    possessive: "this month's",
    last: "last month",
    lastLabel: "Last month",
    before: "the month before",
  },
  year: {
    noun: "year",
    during: "this year",
    thisOne: "this year",
    possessive: "this year's",
    last: "last year",
    lastLabel: "Last year",
    before: "the year before",
  },
  custom: {
    noun: "period",
    during: "in this period",
    thisOne: "this period",
    possessive: "this period's",
    last: "the period before",
    lastLabel: "Period before",
    before: "the period before",
  },
};

/** The right words for talking about a period, so the same sentence works for a week, a month or a year. */
export function periodWords(kind: PeriodKind): PeriodWords {
  return PERIOD_WORDS[kind];
}

// A chart is readable up to about this many bars, so longer periods use bigger bars.
const MAX_BARS = 14;

function bucketUnitFor(period: SummaryPeriod): BucketUnit {
  if (period.kind === "week") return "day";
  if (period.kind === "month") return "week";
  if (period.kind === "year") return "month";
  const days = daysIn(period);
  if (days <= MAX_BARS) return "day";
  if (days <= MAX_BARS * 7) return "week";
  if (days <= MAX_BARS * 30) return "month";
  return "year";
}

function spansYears(period: SummaryPeriod): boolean {
  return new Date(period.start).getFullYear() !== new Date(addDays(period.end, -1)).getFullYear();
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

function summarise(
  trades: JournalEntry[],
  label: { index: number; name: string; short?: string; date: number }
): DaySummary {
  const s = periodStats(trades);
  return { ...label, trades: trades.length, wins: s.wins, losses: s.losses, totalR: s.totalR, pnl: s.pnl };
}

/** Each day that had a closed trade, oldest first, named by its date: "Tue 3 Nov". */
function tradedCalendarDays(closed: JournalEntry[], withYear: boolean): DaySummary[] {
  const byDay = new Map<number, JournalEntry[]>();
  for (const e of closed) {
    const day = startOfDay(closeTime(e));
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([date, trades], index) =>
      summarise(trades, {
        index,
        date,
        name: withYear ? `${WEEKDAY_DAY_MONTH.format(date)} ${new Date(date).getFullYear()}` : WEEKDAY_DAY_MONTH.format(date),
      })
    );
}

/** The bars for the chart: the period cut into days, weeks, months or years. */
function buildBuckets(closed: JournalEntry[], period: SummaryPeriod, unit: BucketUnit): DaySummary[] {
  const withYear = spansYears(period);
  const first =
    unit === "day"
      ? startOfDay(period.start)
      : unit === "week"
        ? startOfWeek(period.start)
        : unit === "month"
          ? startOfMonth(period.start)
          : startOfYear(period.start);
  const next = (ts: number) =>
    unit === "day" ? addDays(ts, 1) : unit === "week" ? addWeeks(ts, 1) : unit === "month" ? addMonths(ts, 1) : addYears(ts, 1);

  const buckets: DaySummary[] = [];
  for (let from = first; from < period.end; from = next(from)) {
    const to = next(from);
    // A bar at the edge of the period only covers the part that is inside it.
    const shown = Math.max(from, period.start);
    const year = new Date(shown).getFullYear();
    const label =
      unit === "day"
        ? { name: WEEKDAY_DAY_MONTH.format(shown), short: DAY_MONTH.format(shown) }
        : unit === "week"
          ? { name: `Week of ${DAY_MONTH.format(shown)}`, short: DAY_MONTH.format(shown) }
          : unit === "month"
            ? {
                name: MONTH_YEAR.format(shown),
                short: withYear ? `${MONTH_SHORT.format(shown)} ${String(year).slice(2)}` : MONTH_SHORT.format(shown),
              }
            : { name: String(year), short: String(year) };
    buckets.push(
      summarise(
        closed.filter((e) => inRange(closeTime(e), from, to)),
        { index: buckets.length, date: shown, ...label }
      )
    );
  }
  return buckets;
}

/** A week's summary. `weekStart` is the Monday it begins on (see startOfWeek). */
export function computeWeeklySummary(entries: JournalEntry[], weekStart: number): WeeklySummary {
  return computePeriodSummary(entries, { kind: "week", start: weekStart, end: addWeeks(weekStart, 1) });
}

export function computePeriodSummary(entries: JournalEntry[], period: SummaryPeriod): PeriodSummary {
  const { start, end } = period;
  const closed = closedBetween(entries, start, end);
  const planned = entries.filter((e) => e.source === "planner" && e.plan && inRange(e.createdAt, start, end));
  const stats = periodStats(closed);

  const before = shiftPeriod(period, -1);
  const previousClosed = closedBetween(entries, before.start, before.end);
  const previous = previousClosed.length > 0 ? periodStats(previousClosed) : null;

  // Day by day. A week lists all seven days, traded or not; anything longer
  // lists only the days that had a closed trade.
  const days: DaySummary[] =
    period.kind === "week"
      ? WEEKDAYS.map((name, index) =>
          summarise(
            closed.filter((e) => weekdayIndex(closeTime(e)) === index),
            { index, name, date: addDays(start, index) }
          )
        )
      : tradedCalendarDays(closed, spansYears(period));

  const bucketUnit = bucketUnitFor(period);
  const buckets = period.kind === "week" ? days : buildBuckets(closed, period, bucketUnit);
  const topBucket = [...buckets].filter((b) => b.trades > 0).sort((a, b) => b.totalR - a.totalR)[0];
  const bestBucketIndex = topBucket && topBucket.totalR > 0 ? topBucket.index : null;

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
    period,
    weekStart: start,
    weekEnd: end,
    plansBuilt: planned.length,
    missingResultCount,
    unfinishedPlans,
    days,
    buckets,
    bucketUnit,
    bestBucketIndex,
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
  const words = periodWords(s.period.kind);
  const closedOn = (day: DaySummary) => closed.filter((e) => startOfDay(closeTime(e)) === day.date);

  // Overtrading: lots of trades in one day, and they lost money on average.
  const busy = s.days
    .filter((d) => d.trades >= 4)
    .map((d) => ({ d, avg: averageR(closedOn(d)) }))
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
  if (tough && tough.date !== busy?.d.date) {
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
      detail: `The planner flagged it in ${flag.count} of ${words.possessive} plans. Spotting it is the first step; before your next trade, ask yourself whether it's driving the decision.`,
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
    if (s.unfinishedPlans > 0) parts.push(`${plural(s.unfinishedPlans, "plan")} from ${words.thisOne} ${s.unfinishedPlans === 1 ? "was" : "were"} never marked as taken or closed`);
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
      title: `A profitable ${words.noun}`,
      detail: `${formatR(s.totalR)} across ${plural(s.closedTrades, "closed trade")}.`,
    });
  }
  if (s.previous && s.closedTrades > 0 && s.totalR - s.previous.totalR >= 1) {
    good.push({
      id: "better-than-last-week",
      tone: "good",
      title: `Better than ${words.last}`,
      detail: `Up ${formatR(round2(s.totalR - s.previous.totalR))} on ${words.before}.`,
    });
  }
  if (s.ruleAdherence.plans >= 2 && s.ruleAdherence.rate === 100) {
    good.push({
      id: "clean-plans",
      tone: "good",
      title: "Every plan passed every check",
      detail: `All ${s.ruleAdherence.plans} plans you built ${words.during} cleared the rule checks. That's the habit that lasts.`,
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

/** A plain-text version of the summary, for copying into notes or a message. */
export function buildSummaryText(s: WeeklySummary): string {
  const range = formatPeriodRange(s.period);
  const title = s.period.kind === "custom" ? `My trading, ${range}` : `My trading ${periodWords(s.period.kind).noun}: ${range}`;
  const lines = [title, ""];
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
