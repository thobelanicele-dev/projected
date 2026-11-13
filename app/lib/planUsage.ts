import { query } from "@/app/lib/db";
import { CONSUME_SQL, PRUNE_OLDER_SQL, READ_USAGE_SQL, REFUND_SQL } from "@/app/lib/usageSchema";
import { usageDay, usagePeriod, type PlanLimits, type UsageMetric } from "@/app/lib/planLimits";

// The daily AI plan cap is counted under its own name, with a day as the
// period, so it sits beside the monthly count without touching it.
export const DAILY_AI_METRIC = "aiPlansDaily";

// "Unlimited" still gets counted (so the usage note can show it) but with a
// ceiling no one will reach.
const UNLIMITED_CAP = 2_000_000_000;

/** Uses one unit of a monthly allowance. allowed=false means the cap was already reached. */
export async function consumeUsage(
  userId: string,
  metric: UsageMetric,
  limit: number | null
): Promise<{ allowed: boolean }> {
  if (limit !== null && limit <= 0) return { allowed: false };
  const rows = await query<{ count: number }>(CONSUME_SQL, [
    userId,
    metric,
    usagePeriod(),
    limit ?? UNLIMITED_CAP,
  ]);
  return { allowed: rows.length > 0 };
}

/** Gives a unit back, e.g. when the AI call it was spent on failed. Best effort. */
export async function refundUsage(userId: string, metric: UsageMetric): Promise<void> {
  try {
    await query(REFUND_SQL, [userId, metric, usagePeriod()]);
  } catch (error) {
    console.error("Failed to refund usage", error);
  }
}

export async function getUsage(userId: string): Promise<Record<UsageMetric, number>> {
  const rows = await query<{ metric: string; count: number }>(READ_USAGE_SQL, [userId, usagePeriod()]);
  const usage: Record<UsageMetric, number> = { aiPlans: 0, backtestRuns: 0 };
  for (const row of rows) {
    if (row.metric === "aiPlans" || row.metric === "backtestRuns") usage[row.metric] = row.count;
  }
  return usage;
}

export type AiPlanDecision = { allowed: true } | { allowed: false; reason: "daily" | "monthly" };

async function refundDailyAiPlan(userId: string, day: string): Promise<void> {
  try {
    await query(REFUND_SQL, [userId, DAILY_AI_METRIC, day]);
  } catch (error) {
    console.error("Failed to refund daily usage", error);
  }
}

/**
 * Uses one AI plan, checking the daily cap (if the plan has one) and then the
 * monthly allowance. A plan refused by one never stays counted against the other.
 */
export async function consumeAiPlan(
  userId: string,
  limits: Pick<PlanLimits, "aiPlans" | "aiPlansPerDay">
): Promise<AiPlanDecision> {
  const dailyLimit = limits.aiPlansPerDay;
  const day = usageDay();

  if (dailyLimit !== null) {
    if (dailyLimit <= 0) return { allowed: false, reason: "daily" };
    const rows = await query<{ count: number }>(CONSUME_SQL, [userId, DAILY_AI_METRIC, day, dailyLimit]);
    if (rows.length === 0) return { allowed: false, reason: "daily" };
    // First plan of the day: clear earlier days' counters so they don't pile up.
    if (rows[0].count === 1) {
      await query(PRUNE_OLDER_SQL, [userId, DAILY_AI_METRIC, day]).catch((error) =>
        console.error("Failed to prune daily usage", error)
      );
    }
  }

  let monthly: { allowed: boolean };
  try {
    monthly = await consumeUsage(userId, "aiPlans", limits.aiPlans);
  } catch (error) {
    if (dailyLimit !== null) await refundDailyAiPlan(userId, day);
    throw error;
  }
  if (!monthly.allowed) {
    if (dailyLimit !== null) await refundDailyAiPlan(userId, day);
    return { allowed: false, reason: "monthly" };
  }
  return { allowed: true };
}

/** Gives an AI plan back on both counts, e.g. when the AI call failed. Best effort. */
export async function refundAiPlan(userId: string): Promise<void> {
  await refundUsage(userId, "aiPlans");
  await refundDailyAiPlan(userId, usageDay());
}

/** How many AI plans this person has made today. */
export async function getAiPlansToday(userId: string): Promise<number> {
  const rows = await query<{ metric: string; count: number }>(READ_USAGE_SQL, [userId, usageDay()]);
  return rows.find((row) => row.metric === DAILY_AI_METRIC)?.count ?? 0;
}
