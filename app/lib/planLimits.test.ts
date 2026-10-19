import { describe, expect, it } from "vitest";
import {
  subscriptionState,
  effectiveTier,
  limitLines,
  limitReachedMessage,
  limitTableRows,
  nextResetDate,
  PLAN_LIMITS,
  usagePeriod,
  isUpgrade,
} from "./planLimits";

describe("effectiveTier", () => {
  it("is free with no plan", () => {
    expect(effectiveTier({ plan: null, subscriptionStatus: null })).toBe("free");
  });

  it("gives the paid tier only while the subscription is active", () => {
    expect(effectiveTier({ plan: "basic", subscriptionStatus: "active" })).toBe("basic");
    expect(effectiveTier({ plan: "premium", subscriptionStatus: "active" })).toBe("premium");
    expect(effectiveTier({ plan: "premium", subscriptionStatus: "cancelled" })).toBe("free");
    expect(effectiveTier({ plan: "premium", subscriptionStatus: null })).toBe("free");
  });

  it("falls back to free for a plan name it doesn't know", () => {
    expect(effectiveTier({ plan: "plus", subscriptionStatus: "active" })).toBe("free");
  });
});

describe("usagePeriod", () => {
  it("buckets by UTC calendar month", () => {
    expect(usagePeriod(new Date("2026-10-15T12:00:00Z"))).toBe("2026-10");
    expect(usagePeriod(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
    expect(usagePeriod(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12");
  });

  it("rolls the reset date over the year boundary", () => {
    expect(nextResetDate(new Date("2026-12-20T00:00:00Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("pricing copy comes from the enforced limits", () => {
  it("renders every tier's bullets from PLAN_LIMITS", () => {
    expect(limitLines("free")[0]).toBe(`${PLAN_LIMITS.free.aiPlans} AI trade plans / month`);
    expect(limitLines("premium")[0]).toBe("Unlimited AI trade plans");
    expect(limitLines("basic")).toContain(`Journal up to ${PLAN_LIMITS.basic.journalEntries} trades`);
    expect(limitLines("free")).toContain("3 months of backtest data");
    expect(limitLines("premium")).toContain("2 years of backtest data");
  });

  it("has a table row for every enforced limit", () => {
    const labels = limitTableRows().map((r) => r[0]);
    expect(labels).toEqual(["AI trade plans", "Backtest runs", "Journal trades", "Backtest history depth"]);
  });

  it("never promises more journal room than the app's storage cap", () => {
    for (const tier of ["free", "basic", "premium"] as const) {
      expect(PLAN_LIMITS[tier].journalEntries).toBeLessThanOrEqual(200);
    }
  });
});

describe("limitReachedMessage", () => {
  it("tells free users to upgrade and premium users to wait", () => {
    expect(limitReachedMessage("aiPlans", "free", 5)).toContain("Upgrade");
    expect(limitReachedMessage("aiPlans", "premium", 5)).not.toContain("Upgrade");
  });
});

describe("cancelled plans keep access until the paid period ends", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  const tomorrow = now + 24 * 60 * 60 * 1000;
  const yesterday = now - 24 * 60 * 60 * 1000;

  it("stays on the paid plan while there is paid time left", () => {
    const user = { plan: "premium", subscriptionStatus: "cancelling", planEndsAt: tomorrow };
    expect(subscriptionState(user, now)).toBe("cancelling");
    expect(effectiveTier(user, now)).toBe("premium");
  });

  it("drops to Free once the paid period is over", () => {
    const user = { plan: "premium", subscriptionStatus: "cancelling", planEndsAt: yesterday };
    expect(subscriptionState(user, now)).toBe("ended");
    expect(effectiveTier(user, now)).toBe("free");
  });

  it("drops to Free right away when cancelled with no end date to honor", () => {
    expect(effectiveTier({ plan: "basic", subscriptionStatus: "cancelled", planEndsAt: null }, now)).toBe("free");
    expect(effectiveTier({ plan: "basic", subscriptionStatus: "cancelling", planEndsAt: null }, now)).toBe("free");
  });

  it("reports active, and none for someone who never subscribed", () => {
    expect(subscriptionState({ plan: "basic", subscriptionStatus: "active" }, now)).toBe("active");
    expect(subscriptionState({ plan: null, subscriptionStatus: null }, now)).toBe("none");
  });
});

describe("isUpgrade", () => {
  it("is true only for moving to a bigger plan", () => {
    expect(isUpgrade("free", "basic")).toBe(true);
    expect(isUpgrade("free", "premium")).toBe(true);
    expect(isUpgrade("basic", "premium")).toBe(true);
    expect(isUpgrade("basic", "basic")).toBe(false);
    expect(isUpgrade("premium", "basic")).toBe(false);
    expect(isUpgrade("premium", "premium")).toBe(false);
  });
});
