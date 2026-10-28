import { describe, expect, it } from "vitest";
import type { JournalEntry } from "@/app/lib/journal";
import type { TradePlan } from "@/app/api/plan/route";
import {
  breakdownByDirection,
  breakdownByInstrument,
  computeConsistency,
  computeDisciplineSplit,
  computeEquityCurve,
  filterByPeriod,
  maxDrawdown,
  periodHeadline,
  periodStart,
} from "./dashboardInsights";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 9, 28, 12).getTime();
const daysAgo = (n: number) => NOW - n * DAY;

let counter = 0;
function trade(over: Partial<JournalEntry> & { ago?: number } = {}): JournalEntry {
  const { ago = 1, ...rest } = over;
  counter += 1;
  return {
    id: `t${String(counter).padStart(3, "0")}`,
    createdAt: daysAgo(ago) - 3600_000,
    source: "imported",
    instrument: "EUR/USD",
    direction: "long",
    status: "closed",
    closedAt: daysAgo(ago),
    outcome: "win",
    rMultiple: 1,
    ...rest,
  };
}

function plan(failed = false): TradePlan {
  return {
    ruleChecks: [
      { rule: "Stop loss", passed: true, note: "" },
      { rule: "Risk reward", passed: !failed, note: "" },
    ],
    biasFlags: [],
  } as unknown as TradePlan;
}

describe("time filter", () => {
  const entries = [trade({ ago: 2 }), trade({ ago: 20 }), trade({ ago: 60 }), trade({ ago: 200 })];

  it("keeps only trades inside the window", () => {
    expect(filterByPeriod(entries, "7d", NOW)).toHaveLength(1);
    expect(filterByPeriod(entries, "30d", NOW)).toHaveLength(2);
    expect(filterByPeriod(entries, "90d", NOW)).toHaveLength(3);
    expect(filterByPeriod(entries, "all", NOW)).toHaveLength(4);
  });

  it("dates a closed trade by when it closed, not when it was made", () => {
    const old = trade({ ago: 1, createdAt: daysAgo(100) });
    expect(filterByPeriod([old], "7d", NOW)).toHaveLength(1);
  });

  it("dates a plan that was never closed by when it was made", () => {
    const planned = trade({ ago: 3, status: "planned", closedAt: undefined, rMultiple: undefined });
    expect(filterByPeriod([planned], "7d", NOW)).toHaveLength(1);
  });

  it("has no start for all time", () => {
    expect(periodStart("all", NOW)).toBeNull();
    expect(periodStart("7d", NOW)).toBe(NOW - 7 * DAY);
  });
});

describe("headline", () => {
  it("says up, down, or flat, and how many trades", () => {
    expect(periodHeadline([trade({ rMultiple: 2 }), trade({ rMultiple: 1.2 })], "30d")).toBe("Up 3.2R over the last 30 days, across 2 trades.");
    expect(periodHeadline([trade({ rMultiple: -1 })], "7d")).toBe("Down 1R over the last 7 days, across 1 trade.");
    expect(periodHeadline([trade({ rMultiple: 1 }), trade({ rMultiple: -1 })], "all")).toBe("Flat over all your trades, across 2 trades.");
  });

  it("says so when there is nothing to report", () => {
    expect(periodHeadline([], "30d")).toBe("No closed trades with a result in the last 30 days.");
  });
});

describe("equity curve and biggest drop", () => {
  it("adds trades up in the order they closed", () => {
    const curve = computeEquityCurve([
      trade({ ago: 1, rMultiple: -1 }),
      trade({ ago: 5, rMultiple: 2 }),
      trade({ ago: 3, rMultiple: 0.5 }),
    ]);
    expect(curve.points.map((p) => p.cumR)).toEqual([2, 2.5, 1.5]);
  });

  it("finds the largest fall from a peak", () => {
    expect(maxDrawdown([1, 3, 2, 0.5, 2.5, 1])).toEqual({ depth: 2.5, peakIndex: 1, troughIndex: 3 });
  });

  it("counts a losing start as a drop from the starting point", () => {
    expect(maxDrawdown([-1, -2, -1.5])).toEqual({ depth: 2, peakIndex: -1, troughIndex: 1 });
  });

  it("has no drop when it only goes up", () => {
    expect(maxDrawdown([1, 2, 3])).toBeNull();
  });

  it("builds a money curve only from trades with a profit figure", () => {
    const curve = computeEquityCurve([
      trade({ ago: 5, rMultiple: 1, profitAmount: 1000 }),
      trade({ ago: 4, rMultiple: 1 }),
      trade({ ago: 3, rMultiple: -1, profitAmount: -400 }),
    ]);
    expect(curve.moneyCount).toBe(2);
    expect(curve.points.map((p) => p.cumMoney)).toEqual([1000, 1000, 600]);
    expect(curve.drawdownMoney?.depth).toBe(400);
  });

  it("offers no money curve when no trade has a profit figure", () => {
    const curve = computeEquityCurve([trade({ rMultiple: 1 })]);
    expect(curve.moneyCount).toBe(0);
    expect(curve.points[0].cumMoney).toBeNull();
    expect(curve.drawdownMoney).toBeNull();
  });

  it("leaves out closed trades with no result", () => {
    expect(computeEquityCurve([trade({ rMultiple: undefined })]).points).toHaveLength(0);
  });
});

describe("consistency", () => {
  const rs = [1, 1, -1, 2, -0.5, -1, -1, 0.5];
  const entries = rs.map((r, i) => trade({ ago: rs.length - i, rMultiple: r }));
  const c = computeConsistency(entries);

  it("averages wins and losses separately", () => {
    expect(c.avgWinR).toBe(1.13); // (1+1+2+0.5)/4
    expect(c.avgLossR).toBe(-0.87); // (-1-0.5-1-1)/4 = -0.875
  });

  it("works out the profit factor", () => {
    expect(c.profitFactor).toBe(1.29); // 4.5 / 3.5
  });

  it("finds the longest streaks and the current one", () => {
    expect(c.longestWinStreak).toBe(2);
    expect(c.longestLossStreak).toBe(3); // -0.5, -1, -1
    expect(c.current).toEqual({ type: "win", length: 1 });
  });

  it("ends a streak on a breakeven", () => {
    const flat = computeConsistency([-1, -1, 0, -1].map((r, i) => trade({ ago: 4 - i, rMultiple: r })));
    expect(flat.longestLossStreak).toBe(2);
    expect(flat.current).toEqual({ type: "loss", length: 1 }); // a new run starts after the breakeven
  });

  it("gives no profit factor without both wins and losses", () => {
    expect(computeConsistency([trade({ rMultiple: 1 })]).profitFactor).toBeNull();
    expect(computeConsistency([trade({ rMultiple: -1 })]).profitFactor).toBeNull();
  });
});

describe("what's working", () => {
  it("groups results by pair, best first", () => {
    const rows = breakdownByInstrument([
      trade({ instrument: "EUR/USD", rMultiple: 2 }),
      trade({ instrument: "EUR/USD", rMultiple: 1 }),
      trade({ instrument: "GBP/JPY", rMultiple: -1 }),
      trade({ instrument: "GBP/JPY", rMultiple: -1 }),
      trade({ instrument: "GBP/JPY", rMultiple: 0.5 }),
    ]);
    expect(rows.map((r) => r.key)).toEqual(["EUR/USD", "GBP/JPY"]);
    expect(rows[0]).toMatchObject({ trades: 2, totalR: 3, avgR: 1.5, winRate: 100 });
    expect(rows[1]).toMatchObject({ trades: 3, totalR: -1.5, avgR: -0.5, winRate: 33 });
  });

  it("splits long from short", () => {
    const rows = breakdownByDirection([
      trade({ direction: "long", rMultiple: 1 }),
      trade({ direction: "short", rMultiple: -1 }),
    ]);
    expect(rows.map((r) => r.key).sort()).toEqual(["Long", "Short"]);
  });

  it("compares trades that cleared every rule check with ones that broke one", () => {
    const split = computeDisciplineSplit([
      trade({ plan: plan(false), rMultiple: 2 }),
      trade({ plan: plan(false), rMultiple: 1 }),
      trade({ plan: plan(true), rMultiple: -1 }),
      trade({ rMultiple: 5 }), // imported, no plan: left out
    ]);
    expect(split.passed).toEqual({ trades: 2, avgR: 1.5 });
    expect(split.broke).toEqual({ trades: 1, avgR: -1 });
  });

  it("reports nothing for a split with no trades", () => {
    expect(computeDisciplineSplit([trade()]).passed).toEqual({ trades: 0, avgR: null });
  });
});
