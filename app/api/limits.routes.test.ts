import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { USAGE_TABLE_SQL } from "@/app/lib/usageSchema";

// Runs the real route handlers with the real usage SQL on a real Postgres
// engine. Only the login lookup, the AI call, and the database connection are
// stand-ins.
const USER = "00000000-0000-0000-0000-0000000000aa";

const state = vi.hoisted(() => ({
  db: null as import("@electric-sql/pglite").PGlite | null,
  session: null as null | {
    id: string;
    email: string;
    plan: string | null;
    subscriptionStatus: string | null;
  },
  aiShouldFail: false,
  aiCalls: 0,
  ipCounter: 0,
}));

vi.mock("@/app/lib/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await state.db!.query(text, params)).rows,
}));
vi.mock("@/app/lib/auth/session", () => ({ getSession: async () => state.session }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: () => "mock-model" }));
vi.mock("ai", () => ({
  generateObject: async () => {
    state.aiCalls += 1;
    if (state.aiShouldFail) throw new Error("model unavailable");
    return { object: { instrument: "EUR/USD" } };
  },
}));

import { POST as planPost } from "@/app/api/plan/route";
import { GET as limitsGet, POST as limitsPost } from "@/app/api/limits/route";
import { GET as candlesGet } from "@/app/api/candles/route";

// A fresh "IP" per request keeps the per-IP rate limiter out of the way.
function req(url: string, init?: { method?: string; body?: unknown }) {
  state.ipCounter += 1;
  return new NextRequest(`http://localhost${url}`, {
    method: init?.method ?? "GET",
    headers: { "x-forwarded-for": `10.0.0.${state.ipCounter}`, "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

const asUser = (plan: string | null, subscriptionStatus: string | null) => {
  state.session = { id: USER, email: "t@example.com", plan, subscriptionStatus };
};

async function usedCount(metric: string): Promise<number> {
  const res = await state.db!.query<{ count: number }>(
    "SELECT count FROM usage_counts WHERE user_id = $1 AND metric = $2",
    [USER, metric]
  );
  return res.rows[0]?.count ?? 0;
}

beforeAll(async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.TWELVE_DATA_API_KEY = "test-key";
  state.db = new PGlite();
  await state.db.exec(`CREATE TABLE users (id UUID PRIMARY KEY);`);
  await state.db.exec(USAGE_TABLE_SQL);
  await state.db.query("INSERT INTO users (id) VALUES ($1)", [USER]);
});

beforeEach(async () => {
  await state.db!.exec("DELETE FROM usage_counts");
  state.aiShouldFail = false;
  state.aiCalls = 0;
  state.session = null;
});

describe("POST /api/plan", () => {
  const plan = () => req("/api/plan", { method: "POST", body: { idea: "buy EUR/USD" } });

  it("lets a Free user make 5 AI plans, then refuses the 6th without calling the AI", async () => {
    asUser(null, null);
    for (let i = 0; i < 5; i++) expect((await planPost(plan())).status).toBe(200);
    expect(state.aiCalls).toBe(5);

    const sixth = await planPost(plan());
    expect(sixth.status).toBe(403);
    const body = await sixth.json();
    expect(body.code).toBe("limit_reached");
    expect(body.error).toContain("Free plan");
    expect(state.aiCalls).toBe(5);
  });

  it("gives a plan back when the AI call fails, so a failure doesn't cost the person one", async () => {
    asUser(null, null);
    state.aiShouldFail = true;
    expect((await planPost(plan())).status).toBe(500);
    expect(await usedCount("aiPlans")).toBe(0);
  });

  it("gives Basic 50 and Premium unlimited", async () => {
    asUser("basic", "active");
    await state.db!.query("INSERT INTO usage_counts VALUES ($1, 'aiPlans', $2, 49)", [USER, currentPeriod()]);
    expect((await planPost(plan())).status).toBe(200);
    expect((await planPost(plan())).status).toBe(403);

    await state.db!.exec("DELETE FROM usage_counts");
    asUser("premium", "active");
    await state.db!.query("INSERT INTO usage_counts VALUES ($1, 'aiPlans', $2, 100000)", [USER, currentPeriod()]);
    expect((await planPost(plan())).status).toBe(200);
  });

  it("treats a cancelled subscription as Free", async () => {
    asUser("premium", "cancelled");
    await state.db!.query("INSERT INTO usage_counts VALUES ($1, 'aiPlans', $2, 5)", [USER, currentPeriod()]);
    expect((await planPost(plan())).status).toBe(403);
  });

  it("requires login", async () => {
    expect((await planPost(plan())).status).toBe(401);
  });
});

describe("/api/limits", () => {
  it("counts 3 backtest runs for Free, then refuses", async () => {
    asUser(null, null);
    const run = () => limitsPost(req("/api/limits", { method: "POST", body: { metric: "backtestRuns" } }));
    expect((await run()).status).toBe(200);
    expect((await run()).status).toBe(200);
    expect((await run()).status).toBe(200);
    const fourth = await run();
    expect(fourth.status).toBe(403);
    expect((await fourth.json()).code).toBe("limit_reached");
  });

  it("won't let the browser spend AI plans directly", async () => {
    asUser(null, null);
    const res = await limitsPost(req("/api/limits", { method: "POST", body: { metric: "aiPlans" } }));
    expect(res.status).toBe(400);
    expect(await usedCount("aiPlans")).toBe(0);
  });

  it("reports the plan, limits, and usage", async () => {
    asUser("basic", "active");
    await state.db!.query("INSERT INTO usage_counts VALUES ($1, 'aiPlans', $2, 7)", [USER, currentPeriod()]);
    const body = await (await limitsGet(req("/api/limits"))).json();
    expect(body.tier).toBe("basic");
    expect(body.limits.aiPlans).toBe(50);
    expect(body.usage.aiPlans).toBe(7);
    expect(body.usage.backtestRuns).toBe(0);
  });

  it("requires login", async () => {
    expect((await limitsGet(req("/api/limits"))).status).toBe(401);
    expect((await limitsPost(req("/api/limits", { method: "POST", body: { metric: "backtestRuns" } }))).status).toBe(401);
  });
});

describe("GET /api/candles history depth", () => {
  it("refuses more history than the plan includes", async () => {
    asUser(null, null);
    const res = await candlesGet(req("/api/candles?symbol=EUR/USD&days=365"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain("3 months");

    asUser("basic", "active");
    expect((await candlesGet(req("/api/candles?symbol=EUR/USD&days=730"))).status).toBe(403);
  });

  it("lets a plan fetch up to its own depth", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ values: [{ datetime: "2026-10-01", open: "1", high: "2", low: "1", close: "1.5" }] }))
    );
    asUser(null, null);
    expect((await candlesGet(req("/api/candles?symbol=EUR/USD&days=90"))).status).toBe(200);
    asUser("premium", "active");
    expect((await candlesGet(req("/api/candles?symbol=EUR/USD&days=730"))).status).toBe(200);
    fetchSpy.mockRestore();
  });
});

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
