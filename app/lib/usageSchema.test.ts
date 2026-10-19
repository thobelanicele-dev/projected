import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { CONSUME_SQL, READ_USAGE_SQL, REFUND_SQL, USAGE_TABLE_SQL } from "./usageSchema";

// Runs the exact SQL the app uses against a real Postgres engine, since the
// monthly caps depend on it behaving atomically.
let db: PGlite;
const USER_A = "00000000-0000-0000-0000-00000000000a";
const USER_B = "00000000-0000-0000-0000-00000000000b";

async function consume(user: string, metric: string, period: string, limit: number) {
  const res = await db.query(CONSUME_SQL, [user, metric, period, limit]);
  return res.rows.length > 0;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE users (id UUID PRIMARY KEY);`);
  await db.exec(USAGE_TABLE_SQL);
  await db.query("INSERT INTO users (id) VALUES ($1), ($2)", [USER_A, USER_B]);
});

afterAll(async () => {
  await db.close();
});

describe("usage caps", () => {
  it("allows exactly `limit` uses, then refuses", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) results.push(await consume(USER_A, "aiPlans", "2026-10", 5));
    expect(results).toEqual([true, true, true, true, true, false, false]);
  });

  it("does not count refused attempts", async () => {
    const res = await db.query<{ metric: string; count: number }>(READ_USAGE_SQL, [USER_A, "2026-10"]);
    expect(res.rows.find((r) => r.metric === "aiPlans")?.count).toBe(5);
  });

  it("can't be beaten by simultaneous requests", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () => consume(USER_B, "backtestRuns", "2026-10", 3))
    );
    expect(attempts.filter(Boolean)).toHaveLength(3);
  });

  it("gives a use back on refund, and never goes below zero", async () => {
    await db.query(REFUND_SQL, [USER_A, "aiPlans", "2026-10"]);
    expect(await consume(USER_A, "aiPlans", "2026-10", 5)).toBe(true);
    expect(await consume(USER_A, "aiPlans", "2026-10", 5)).toBe(false);

    await db.query(REFUND_SQL, [USER_A, "backtestRuns", "2026-10"]);
    const res = await db.query<{ count: number }>(
      "SELECT count FROM usage_counts WHERE user_id = $1 AND metric = 'backtestRuns'",
      [USER_A]
    );
    expect(res.rows).toHaveLength(0);
  });

  it("starts fresh in a new month", async () => {
    expect(await consume(USER_A, "aiPlans", "2026-11", 5)).toBe(true);
  });

  it("keeps users and metrics separate", async () => {
    expect(await consume(USER_B, "aiPlans", "2026-10", 5)).toBe(true);
    const a = await db.query<{ count: number }>(
      "SELECT count FROM usage_counts WHERE user_id = $1 AND metric = 'aiPlans' AND period = '2026-10'",
      [USER_A]
    );
    expect(a.rows[0].count).toBe(5);
  });

  it("deletes a user's usage rows when the user is deleted", async () => {
    await db.query("DELETE FROM users WHERE id = $1", [USER_B]);
    const res = await db.query("SELECT 1 FROM usage_counts WHERE user_id = $1", [USER_B]);
    expect(res.rows).toHaveLength(0);
  });
});
