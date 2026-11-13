// Single source of truth for what each plan includes. The pricing cards, the
// server routes, and the in-app limit messages all read from here so the
// numbers a visitor is promised can't drift from what is actually enforced.

export type PlanTier = "free" | "basic" | "premium";

export interface PlanLimits {
  /** AI trade plans per calendar month. null = unlimited. */
  aiPlans: number | null;
  /** AI trade plans per day, on top of the monthly allowance. null = no daily cap. */
  aiPlansPerDay: number | null;
  /** Backtest runs per calendar month. null = unlimited. */
  backtestRuns: number | null;
  /** Journal entries kept in the browser. */
  journalEntries: number;
  /** How many days of price history the backtester can load. */
  backtestDays: number;
}

// The most journal entries the app will ever keep. The journal lives in the
// browser's storage, which holds roughly 2.5 million characters on the
// strictest browsers. A saved AI plan is about 5,400 characters, so 300 of
// them is about 1.6 million: safe everywhere. 500 would not be.
export const JOURNAL_STORAGE_CAP = 300;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { aiPlans: 5, aiPlansPerDay: null, backtestRuns: 3, journalEntries: 20, backtestDays: 90 },
  // Sized so someone trading every day runs out in about the third week of
  // the month, which is when Premium's "unlimited" starts to matter. The daily
  // cap spreads the month's plans out and is one more thing Premium removes.
  basic: { aiPlans: 30, aiPlansPerDay: 3, backtestRuns: 10, journalEntries: 100, backtestDays: 365 },
  // Even Premium has a journal ceiling rather than "unlimited": see
  // JOURNAL_STORAGE_CAP above.
  premium: { aiPlans: null, aiPlansPerDay: null, backtestRuns: null, journalEntries: JOURNAL_STORAGE_CAP, backtestDays: 730 },
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: "Free",
  basic: "Basic",
  premium: "Premium",
};

export type UsageMetric = "aiPlans" | "backtestRuns";

export interface SubscriptionFields {
  plan: string | null;
  subscriptionStatus: string | null;
  /** When a cancelled plan's paid period ends, in ms since the epoch. */
  planEndsAt?: number | null;
}

/**
 * Where a user's subscription stands.
 * - active: a paid plan that renews
 * - cancelling: renewal is off, but they've paid through planEndsAt
 * - ended: they had a paid plan that has now lapsed
 * - none: never subscribed
 */
export type SubscriptionState = "none" | "active" | "cancelling" | "ended";

export function subscriptionState(user: SubscriptionFields, now: number = Date.now()): SubscriptionState {
  if (user.plan !== "basic" && user.plan !== "premium") return "none";
  if (user.subscriptionStatus === "active") return "active";
  if (user.subscriptionStatus === "cancelling" && (user.planEndsAt ?? 0) > now) return "cancelling";
  if (user.subscriptionStatus === "cancelling" || user.subscriptionStatus === "cancelled") return "ended";
  return "none";
}

/** Which plan a user is actually on right now. Paid features last for as long as the period they paid for. */
export function effectiveTier(user: SubscriptionFields, now: number = Date.now()): PlanTier {
  const state = subscriptionState(user, now);
  if ((state === "active" || state === "cancelling") && (user.plan === "basic" || user.plan === "premium")) {
    return user.plan;
  }
  return "free";
}

const TIER_RANK: Record<PlanTier, number> = { free: 0, basic: 1, premium: 2 };

/** True when `target` is a bigger plan than `current`. Used to allow upgrades and nothing else. */
export function isUpgrade(current: PlanTier, target: PlanTier): boolean {
  return TIER_RANK[target] > TIER_RANK[current];
}

/** Calendar-month bucket, in UTC, e.g. "2026-10". Usage resets when it rolls over. */
export function usagePeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextResetDate(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Day bucket, in UTC, e.g. "2026-11-13". The daily cap resets when it rolls over. */
export function usageDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function nextDailyResetDate(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function historyLabel(days: number): string {
  if (days >= 730) return "2 years";
  if (days >= 365) return "1 year";
  return `${Math.round(days / 30)} months`;
}

function perMonth(n: number | null, noun: string): string {
  return n === null ? `Unlimited ${noun}` : `${n} ${noun} / month`;
}

/** The bullet list shown on each pricing card. */
export function limitLines(tier: PlanTier): string[] {
  const l = PLAN_LIMITS[tier];
  return [
    perMonth(l.aiPlans, "AI trade plans") + (l.aiPlansPerDay === null ? "" : `, ${l.aiPlansPerDay} a day`),
    perMonth(l.backtestRuns, "backtest runs"),
    `Journal up to ${l.journalEntries} trades`,
    `${historyLabel(l.backtestDays)} of backtest data`,
    "Any broker, CSV import",
  ];
}

/** The rows of the pricing comparison table: [label, free, basic, premium]. */
export function limitTableRows(): [string, string, string, string][] {
  const cell = (n: number | null, suffix = "") => (n === null ? "Unlimited" : `${n}${suffix}`);
  const aiCell = (l: PlanLimits) =>
    cell(l.aiPlans, " / mo") + (l.aiPlansPerDay === null ? "" : `, ${l.aiPlansPerDay} / day`);
  const f = PLAN_LIMITS.free;
  const b = PLAN_LIMITS.basic;
  const p = PLAN_LIMITS.premium;
  return [
    ["AI trade plans", aiCell(f), aiCell(b), aiCell(p)],
    ["Backtest runs", cell(f.backtestRuns, " / mo"), cell(b.backtestRuns, " / mo"), cell(p.backtestRuns, " / mo")],
    ["Journal trades", String(f.journalEntries), String(b.journalEntries), String(p.journalEntries)],
    [
      "Backtest history depth",
      historyLabel(f.backtestDays),
      historyLabel(b.backtestDays),
      historyLabel(p.backtestDays),
    ],
  ];
}

const METRIC_NOUN: Record<UsageMetric, string> = {
  aiPlans: "AI trade plans",
  backtestRuns: "backtest runs",
};

/** What we tell someone who has hit a monthly cap. */
export function limitReachedMessage(metric: UsageMetric, tier: PlanTier, limit: number): string {
  const upgrade =
    tier === "premium" ? "It resets at the start of next month." : "Upgrade for more, or wait for next month.";
  return `You've used all ${limit} ${METRIC_NOUN[metric]} on the ${PLAN_NAMES[tier]} plan this month. ${upgrade}`;
}

/**
 * What we tell someone who has used today's AI plans. It counts down in hours
 * rather than naming a clock time, so it reads right in every time zone.
 */
export function dailyLimitReachedMessage(tier: PlanTier, limit: number, now: Date = new Date()): string {
  const hours = Math.max(1, Math.ceil((nextDailyResetDate(now).getTime() - now.getTime()) / 3_600_000));
  const wait = hours === 1 ? "about an hour" : `about ${hours} hours`;
  return `You've used all ${limit} AI trade plans for today on the ${PLAN_NAMES[tier]} plan. You can make more in ${wait}, or upgrade to Premium for no daily limit.`;
}

export function historyLimitMessage(tier: PlanTier): string {
  const days = PLAN_LIMITS[tier].backtestDays;
  const upgrade = tier === "premium" ? "" : " Upgrade to go further back.";
  return `The ${PLAN_NAMES[tier]} plan includes up to ${historyLabel(days)} of price history.${upgrade}`;
}

export function journalFullMessage(tier: PlanTier): string {
  const max = PLAN_LIMITS[tier].journalEntries;
  const upgrade = tier === "premium" ? "" : " or upgrade for more room";
  return `Your journal is full (${max} of ${max} on the ${PLAN_NAMES[tier]} plan). Delete older entries${upgrade}.`;
}
