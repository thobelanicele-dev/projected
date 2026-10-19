import { query } from "@/app/lib/db";
import { CONSUME_SQL, READ_USAGE_SQL, REFUND_SQL } from "@/app/lib/usageSchema";
import { usagePeriod, type UsageMetric } from "@/app/lib/planLimits";

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
