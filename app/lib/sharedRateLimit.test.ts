import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const state = vi.hoisted(() => ({ db: null as import("@electric-sql/pglite").PGlite | null, failing: false }));

vi.mock("@/app/lib/db", () => ({
  query: async (text: string, params: unknown[] = []) => {
    if (state.failing) throw new Error("database down");
    return (await state.db!.query(text, params)).rows;
  },
}));

import { checkSharedRateLimit } from "./sharedRateLimit";
import { RATE_LIMITS_TABLE_SQL } from "./rateLimitSchema";

const MIN = 60 * 1000;

beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec(RATE_LIMITS_TABLE_SQL);
});

describe("shared rate limit", () => {
  it("allows up to the limit, then blocks and says how long to wait", async () => {
    const t = 1_000_000;
    for (let i = 1; i <= 3; i++) {
      const r = await checkSharedRateLimit("login:1.1.1.1", 3, 10 * MIN, t + i);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(3 - i);
    }
    const blocked = await checkSharedRateLimit("login:1.1.1.1", 3, 10 * MIN, t + 4000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(600);
  });

  it("keeps each caller's count separate", async () => {
    const t = 5_000_000;
    await checkSharedRateLimit("login:2.2.2.2", 1, 10 * MIN, t);
    expect((await checkSharedRateLimit("login:2.2.2.2", 1, 10 * MIN, t + 1)).allowed).toBe(false);
    expect((await checkSharedRateLimit("login:3.3.3.3", 1, 10 * MIN, t + 1)).allowed).toBe(true);
  });

  it("starts a fresh window once the old one has ended", async () => {
    const t = 9_000_000;
    await checkSharedRateLimit("signup:4.4.4.4", 1, 10 * MIN, t);
    expect((await checkSharedRateLimit("signup:4.4.4.4", 1, 10 * MIN, t + 1)).allowed).toBe(false);
    expect((await checkSharedRateLimit("signup:4.4.4.4", 1, 10 * MIN, t + 10 * MIN + 1)).allowed).toBe(true);
  });

  it("counts requests that arrive at the same moment correctly", async () => {
    const t = 20_000_000;
    const results = await Promise.all(
      Array.from({ length: 10 }, () => checkSharedRateLimit("reset:5.5.5.5", 4, 10 * MIN, t))
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(4);
  });

  it("falls back to the in-memory limiter if the database is down", async () => {
    state.failing = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = await checkSharedRateLimit("fallback:6.6.6.6", 1, 10 * MIN);
    const second = await checkSharedRateLimit("fallback:6.6.6.6", 1, 10 * MIN);
    state.failing = false;
    spy.mockRestore();
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });
});
