import { createHmac } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";

const USER = "00000000-0000-0000-0000-0000000000bb";
const EMAIL = "payer@example.com";
const SUB_CODE = "SUB_test123";
const DAY = 24 * 60 * 60 * 1000;

const state = vi.hoisted(() => ({
  db: null as import("@electric-sql/pglite").PGlite | null,
  session: null as null | Record<string, unknown>,
  paidThrough: null as number | null,
  disableFails: false,
  disableCalls: [] as string[][],
  ip: 0,
}));

vi.mock("@/app/lib/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await state.db!.query(text, params)).rows,
}));
vi.mock("@/app/lib/auth/session", () => ({ getSession: async () => state.session }));
vi.mock("@/app/lib/paystack", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/lib/paystack")>()),
  fetchSubscription: async () => ({
    subscriptionCode: SUB_CODE,
    emailToken: "tok_abc",
    paidThrough: state.paidThrough,
  }),
  disableSubscription: async (code: string, token: string) => {
    state.disableCalls.push([code, token]);
    if (state.disableFails) throw new Error("paystack down");
  },
}));

import { POST as cancelPost } from "@/app/api/billing/cancel/route";
import { POST as webhookPost } from "@/app/api/billing/webhook/route";
import { PLAN_CODES } from "@/app/lib/paystack";

async function setUser(fields: { plan: string | null; status: string | null; endsAt?: number | null }) {
  await state.db!.query(
    `UPDATE users SET plan = $1, subscription_status = $2, plan_ends_at = $3, paystack_subscription_code = $4 WHERE id = $5`,
    [fields.plan, fields.status, fields.endsAt ?? null, SUB_CODE, USER]
  );
  state.session = {
    id: USER,
    email: EMAIL,
    plan: fields.plan,
    subscriptionStatus: fields.status,
    planEndsAt: fields.endsAt ?? null,
  };
}

async function row() {
  const res = await state.db!.query<{ subscription_status: string | null; plan_ends_at: string | null }>(
    "SELECT subscription_status, plan_ends_at FROM users WHERE id = $1",
    [USER]
  );
  return {
    status: res.rows[0].subscription_status,
    endsAt: res.rows[0].plan_ends_at ? Number(res.rows[0].plan_ends_at) : null,
  };
}

const cancel = () => cancelPost();

function webhook(event: string, data: Record<string, unknown>, opts: { badSignature?: boolean } = {}) {
  const body = JSON.stringify({ event, data });
  const signature = opts.badSignature ? "nope" : createHmac("sha512", "sk_test_x").update(body).digest("hex");
  state.ip += 1;
  return webhookPost(
    new NextRequest("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": signature, "x-forwarded-for": `10.1.0.${state.ip}` },
      body,
    })
  );
}

beforeAll(async () => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_x";
  state.db = new PGlite();
  await state.db.exec(`
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      email TEXT,
      plan TEXT,
      subscription_status TEXT,
      plan_ends_at BIGINT,
      paystack_customer_code TEXT,
      paystack_subscription_code TEXT
    );
  `);
  await state.db.query("INSERT INTO users (id, email) VALUES ($1, $2)", [USER, EMAIL]);
});

beforeEach(() => {
  state.paidThrough = Date.now() + 20 * DAY;
  state.disableFails = false;
  state.disableCalls = [];
  state.session = null;
});

describe("POST /api/billing/cancel", () => {
  it("stops renewal and records the end of the paid period", async () => {
    await setUser({ plan: "basic", status: "active" });
    const res = await cancel();
    expect(res.status).toBe(200);
    expect(state.disableCalls).toEqual([[SUB_CODE, "tok_abc"]]);
    expect(await row()).toEqual({ status: "cancelling", endsAt: state.paidThrough });
  });

  it("refuses a second cancel without contacting Paystack again", async () => {
    await setUser({ plan: "basic", status: "cancelling", endsAt: Date.now() + 5 * DAY });
    expect((await cancel()).status).toBe(409);
    expect(state.disableCalls).toHaveLength(0);
  });

  it("won't cancel blind when Paystack gives no billing date", async () => {
    await setUser({ plan: "premium", status: "active" });
    state.paidThrough = null;
    expect((await cancel()).status).toBe(502);
    expect(state.disableCalls).toHaveLength(0);
    expect((await row()).status).toBe("active");
  });

  it("leaves the plan active if Paystack fails to cancel", async () => {
    await setUser({ plan: "premium", status: "active" });
    state.disableFails = true;
    expect((await cancel()).status).toBe(500);
    expect(await row()).toEqual({ status: "active", endsAt: null });
  });

  it("only applies to active paid plans, and requires login", async () => {
    await setUser({ plan: null, status: null });
    expect((await cancel()).status).toBe(400);
    state.session = null;
    expect((await cancel()).status).toBe(401);
  });
});

describe("Paystack webhook", () => {
  it("keeps access through the paid period when a cancellation arrives", async () => {
    const endsAt = Date.now() + 10 * DAY;
    await setUser({ plan: "basic", status: "cancelling", endsAt });
    await webhook("subscription.disable", { subscription_code: SUB_CODE });
    expect(await row()).toEqual({ status: "cancelling", endsAt });
  });

  it("uses the date in the event when the cancel was done from Paystack's own dashboard", async () => {
    await setUser({ plan: "basic", status: "active" });
    const next = new Date(Date.now() + 12 * DAY);
    await webhook("subscription.disable", { subscription_code: SUB_CODE, next_payment_date: next.toISOString() });
    const after = await row();
    expect(after.status).toBe("cancelling");
    expect(after.endsAt).toBe(next.getTime());
  });

  it("downgrades straight away when there is no paid time left to honor", async () => {
    await setUser({ plan: "basic", status: "active" });
    await webhook("subscription.disable", { subscription_code: SUB_CODE });
    expect((await row()).status).toBe("cancelled");
  });

  it("doesn't let a late payment event undo a cancellation that still has paid time", async () => {
    await setUser({ plan: "basic", status: "cancelling", endsAt: Date.now() + 10 * DAY });
    await webhook("charge.success", { customer: { email: EMAIL }, plan: { plan_code: PLAN_CODES.basic } });
    expect((await row()).status).toBe("cancelling");
  });

  it("does reactivate a lapsed plan on a new payment", async () => {
    await setUser({ plan: "basic", status: "cancelled" });
    await webhook("charge.success", { customer: { email: EMAIL }, plan: { plan_code: PLAN_CODES.basic } });
    expect((await row()).status).toBe("active");
  });

  it("clears the old end date when a fresh subscription starts", async () => {
    await setUser({ plan: "basic", status: "cancelling", endsAt: Date.now() - DAY });
    await webhook("subscription.create", {
      plan: { plan_code: PLAN_CODES.premium },
      customer: { email: EMAIL, customer_code: "CUS_1" },
      subscription_code: "SUB_new",
    });
    const res = await state.db!.query<{ plan: string; subscription_status: string; plan_ends_at: string | null }>(
      "SELECT plan, subscription_status, plan_ends_at FROM users WHERE id = $1",
      [USER]
    );
    expect(res.rows[0]).toEqual({ plan: "premium", subscription_status: "active", plan_ends_at: null });
  });

  it("rejects an event with a bad signature and changes nothing", async () => {
    await setUser({ plan: "basic", status: "active" });
    const res = await webhook("subscription.disable", { subscription_code: SUB_CODE }, { badSignature: true });
    expect(res.status).toBe(400);
    expect((await row()).status).toBe("active");
  });
});
