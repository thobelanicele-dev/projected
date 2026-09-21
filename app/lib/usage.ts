import { query } from "@/app/lib/db";

// Anonymous, aggregate-only usage counts — see the tool_usage table comment
// in db.ts. Deliberately just "which tool, which day, how many times" with
// nothing tying a count to a specific person.
export const TRACKED_TOOLS = ["planner", "risk-calculator", "backtest", "journal", "dashboard"] as const;

export type TrackedTool = (typeof TRACKED_TOOLS)[number];

export function isTrackedTool(value: unknown): value is TrackedTool {
  return typeof value === "string" && (TRACKED_TOOLS as readonly string[]).includes(value);
}

export async function recordToolUsage(tool: TrackedTool): Promise<void> {
  await query(
    `INSERT INTO tool_usage (tool, day, count) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (tool, day) DO UPDATE SET count = tool_usage.count + 1`,
    [tool]
  );
}
