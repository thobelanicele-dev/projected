import { describe, expect, it } from "vitest";
import type { JournalEntry } from "@/app/lib/journal";
import type { TradePlan } from "@/app/api/plan/route";
import {
  addWeeks,
  buildSummaryText,
  computeBestDayToTrade,
  computeWeeklySummary,
  formatR,
  startOfWeek,
} from "./weeklySummary";

// Local-time dates throughout, because weeks follow the trader's own clock.
const MON = new Date(2026, 9, 19, 0, 0, 0).getTime(); // Monday 19 Oct 2026
const at = (dayOffset: number, hour = 12) => new Date(2026, 9, 19 + dayOffset, hour).getTime();

let counter = 0;
function trade(overrides: Partial<JournalEntry> & { day: number }): JournalEntry {
  const { day, ...rest } = overrides;
  counter += 1;
  return {
    id: `t${counter}`,
    createdAt: at(day, 9),
    source: "imported",
    instrument: "EUR/USD",
    direction: "long",
    status: "closed",
    closedAt: at(day),
    outcome: "win",
    rMultiple: 1,
    ...rest,
  };
}

function plan(opts: { failed?: string[]; flags?: string[]; rr?: number | null } = {}): TradePlan {
  const rules = ["Stop loss", "Position size", "Risk reward", "No averaging", "Invalidation"];
  return {
    instrument: "EUR/USD",
    direction: "long",
    riskRewardRatio: opts.rr === undefined ? 2 : opts.rr,
    ruleChecks: rules.map((rule) => ({ rule, passed: !(opts.failed ?? []).includes(rule), note: "" })),
    biasFlags: (opts.flags ?? []).map((flag) => ({ flag, severity: "medium", note: "" })),
  } as unknown as TradePlan;
}

describe("week boundaries", () => {
  it("starts the week on Monday, whatever day you ask from", () => {
    expect(startOfWeek(new Date(2026, 9, 21, 15))).toBe(MON); // Wednesday
    expect(startOfWeek(new Date(2026, 9, 25, 23, 59))).toBe(MON); // Sunday night
    expect(startOfWeek(MON)).toBe(MON);
  });

  it("moves by whole weeks", () => {
    expect(addWeeks(MON, 1)).toBe(new Date(2026, 9, 26).getTime());
    expect(addWeeks(MON, -1)).toBe(new Date(2026, 9, 12).getTime());
  });

  it("counts Sunday night in this week and Monday morning in the next", () => {
    const entries = [trade({ day: 6, closedAt: new Date(2026, 9, 25, 23, 59).getTime() }), trade({ day: 7, closedAt: new Date(2026, 9, 26, 0, 0).getTime() })];
    expect(computeWeeklySummary(entries, MON).closedTrades).toBe(1);
    expect(computeWeeklySummary(entries, addWeeks(MON, 1)).closedTrades).toBe(1);
  });
});

describe("the week's numbers", () => {
  const entries = [
    trade({ day: 0, rMultiple: 2, outcome: "win", profitAmount: 200 }),
    trade({ day: 1, rMultiple: -1, outcome: "loss", profitAmount: -100 }),
    trade({ day: 1, rMultiple: 1.5, outcome: "win", profitAmount: 150 }),
    trade({ day: 3, rMultiple: 0, outcome: "breakeven" }),
  ];
  const s = computeWeeklySummary(entries, MON);

  it("adds up results and profit", () => {
    expect(s.closedTrades).toBe(4);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.breakevens).toBe(1);
    expect(s.winRate).toBe(67); // breakevens don't count either way
    expect(s.totalR).toBe(2.5);
    expect(s.avgR).toBe(0.63);
    expect(s.pnl).toBe(250);
    expect(s.pnlTradeCount).toBe(3);
  });

  it("splits the week into seven days and finds the best", () => {
    expect(s.days).toHaveLength(7);
    expect(s.days[1].trades).toBe(2);
    expect(s.days[1].totalR).toBe(0.5);
    expect(s.bestDay?.name).toBe("Monday");
    expect(s.worstDay).toBeNull(); // no losing day
  });

  it("names the best trade, and no worst trade without a loss", () => {
    expect(s.bestTrade?.rMultiple).toBe(2);
    expect(s.worstTrade?.rMultiple).toBe(-1);
  });

  it("reports no profit figure when none of the trades have one", () => {
    const none = computeWeeklySummary([trade({ day: 0 })], MON);
    expect(none.pnl).toBeNull();
  });

  it("calls no day best when every day lost", () => {
    const losing = computeWeeklySummary([trade({ day: 0, rMultiple: -1, outcome: "loss" })], MON);
    expect(losing.bestDay).toBeNull();
    expect(losing.worstDay?.name).toBe("Monday");
  });

  it("handles an empty week", () => {
    const empty = computeWeeklySummary([], MON);
    expect(empty.closedTrades).toBe(0);
    expect(empty.winRate).toBeNull();
    expect(empty.totalR).toBe(0);
    expect(empty.insights).toEqual([]);
  });

  it("compares with the week before, only when there was one", () => {
    const withPrev = computeWeeklySummary([trade({ day: 0, rMultiple: 1 }), trade({ day: -3, rMultiple: 0.5 })], MON);
    expect(withPrev.previous?.totalR).toBe(0.5);
    expect(computeWeeklySummary([trade({ day: 0 })], MON).previous).toBeNull();
  });
});

describe("where you could improve", () => {
  const ids = (entries: JournalEntry[]) => computeWeeklySummary(entries, MON).insights.map((i) => i.id);

  it("flags overtrading on a losing busy day", () => {
    const busy = Array.from({ length: 4 }, () => trade({ day: 2, rMultiple: -0.5, outcome: "loss" }));
    expect(ids(busy)).toContain("overtrading");
  });

  it("does not flag a busy day that made money", () => {
    const busy = Array.from({ length: 4 }, () => trade({ day: 2, rMultiple: 0.5 }));
    expect(ids(busy)).not.toContain("overtrading");
  });

  it("names the costliest day", () => {
    const entries = [trade({ day: 4, rMultiple: -1, outcome: "loss" }), trade({ day: 4, rMultiple: -1, outcome: "loss" })];
    const insight = computeWeeklySummary(entries, MON).insights.find((i) => i.id === "worst-day");
    expect(insight?.title).toContain("Friday");
  });

  it("notices that trades which broke a rule did worse", () => {
    const entries = [
      trade({ day: 0, plan: plan({ failed: ["Risk reward"] }), rMultiple: -1, outcome: "loss" }),
      trade({ day: 1, plan: plan({ failed: ["Risk reward"] }), rMultiple: -1, outcome: "loss" }),
      trade({ day: 2, plan: plan(), rMultiple: 1.5 }),
      trade({ day: 3, plan: plan(), rMultiple: 1 }),
    ];
    expect(ids(entries)).toContain("rules-vs-results");
  });

  it("warns when plans keep failing the checks", () => {
    const entries = [
      trade({ day: 0, source: "planner", status: "planned", plan: plan({ failed: ["Stop loss"] }) }),
      trade({ day: 1, source: "planner", status: "planned", plan: plan({ failed: ["Stop loss"] }) }),
    ];
    const insight = computeWeeklySummary(entries, MON).insights.find((i) => i.id === "rule-adherence");
    expect(insight?.detail).toContain("stop loss");
  });

  it("surfaces a bias that kept showing up", () => {
    const entries = [
      trade({ day: 0, source: "planner", status: "planned", plan: plan({ flags: ["Revenge trading"] }) }),
      trade({ day: 1, source: "planner", status: "planned", plan: plan({ flags: ["revenge trading"] }) }),
    ];
    const s = computeWeeklySummary(entries, MON);
    expect(s.topBiasFlags[0].count).toBe(2); // same flag, different capitals
    expect(s.insights.map((i) => i.id)).toContain("bias");
  });

  it("notices finishing short of the plan", () => {
    const entries = [
      trade({ day: 0, plan: plan({ rr: 3 }), rMultiple: 1 }),
      trade({ day: 1, plan: plan({ rr: 3 }), rMultiple: 1.2 }),
    ];
    expect(ids(entries)).toContain("short-of-plan");
  });

  it("points out a market that keeps losing", () => {
    const entries = [
      trade({ day: 0, instrument: "GBP/JPY", rMultiple: -1, outcome: "loss" }),
      trade({ day: 1, instrument: "GBP/JPY", rMultiple: -0.5, outcome: "loss" }),
    ];
    const insight = computeWeeklySummary(entries, MON).insights.find((i) => i.id === "market");
    expect(insight?.title).toContain("GBP/JPY");
  });

  it("asks you to finish logging trades with no result or plans left open", () => {
    const entries = [
      trade({ day: 0, rMultiple: undefined }),
      trade({ day: 1, source: "planner", status: "planned", plan: plan() }),
    ];
    const s = computeWeeklySummary(entries, MON);
    expect(s.missingResultCount).toBe(1);
    expect(s.unfinishedPlans).toBe(1);
    expect(s.insights.map((i) => i.id)).toContain("housekeeping");
  });

  it("keeps the list short", () => {
    const s = computeWeeklySummary(
      [
        ...Array.from({ length: 4 }, () => trade({ day: 2, instrument: "GBP/JPY", rMultiple: -0.5, outcome: "loss" })),
        trade({ day: 4, rMultiple: undefined }),
        trade({ day: 5, source: "planner", status: "planned", plan: plan({ failed: ["Stop loss"], flags: ["FOMO"] }) }),
        trade({ day: 6, source: "planner", status: "planned", plan: plan({ failed: ["Stop loss"], flags: ["FOMO"] }) }),
      ],
      MON
    );
    expect(s.insights.filter((i) => i.tone === "improve").length).toBeLessThanOrEqual(4);
  });
});

describe("what went well", () => {
  it("celebrates a profitable week, a beat on last week, and the best trade", () => {
    const s = computeWeeklySummary(
      [trade({ day: 0, rMultiple: 2 }), trade({ day: 1, rMultiple: 1 }), trade({ day: -3, rMultiple: 0.5 })],
      MON
    );
    const good = s.insights.filter((i) => i.tone === "good").map((i) => i.id);
    expect(good).toEqual(expect.arrayContaining(["profitable-week", "better-than-last-week", "best-trade"]));
  });

  it("praises plans that all passed", () => {
    const s = computeWeeklySummary(
      [
        trade({ day: 0, source: "planner", status: "planned", plan: plan() }),
        trade({ day: 1, source: "planner", status: "planned", plan: plan() }),
      ],
      MON
    );
    expect(s.insights.map((i) => i.id)).toContain("clean-plans");
  });
});

describe("best day to trade", () => {
  it("won't name a day until there are enough trades", () => {
    const few = Array.from({ length: 5 }, () => trade({ day: 1 }));
    const result = computeBestDayToTrade(few);
    expect(result.ready).toBe(false);
    expect(result.best).toBeNull();
    expect(result.tradesCounted).toBe(5);
  });

  it("picks the weekday with the best average, once it has enough behind it", () => {
    const entries = [
      ...Array.from({ length: 4 }, (_, i) => trade({ day: i * 7 + 1, rMultiple: 1.5 })), // Tuesdays
      ...Array.from({ length: 4 }, (_, i) => trade({ day: i * 7 + 3, rMultiple: -0.5, outcome: "loss" })), // Thursdays
      ...Array.from({ length: 4 }, (_, i) => trade({ day: i * 7, rMultiple: 0.2 })), // Mondays
    ];
    const result = computeBestDayToTrade(entries);
    expect(result.ready).toBe(true);
    expect(result.best?.name).toBe("Tuesday");
    expect(result.worst?.name).toBe("Thursday");
  });

  it("ignores a day with only one or two trades, however good", () => {
    const entries = [
      ...Array.from({ length: 12 }, (_, i) => trade({ day: i * 7, rMultiple: 0.3 })), // Mondays
      trade({ day: 2, rMultiple: 9 }), // one lucky Wednesday
    ];
    expect(computeBestDayToTrade(entries).best?.name).toBe("Monday");
  });
});

describe("copyable summary", () => {
  it("includes the headline numbers", () => {
    const text = buildSummaryText(computeWeeklySummary([trade({ day: 0, rMultiple: 2, profitAmount: 120 })], MON));
    expect(text).toContain("Closed trades: 1");
    expect(text).toContain("+2R");
    expect(text).toContain("Profit / loss: +120");
  });

  it("formats results with a sign", () => {
    expect(formatR(1.5)).toBe("+1.5R");
    expect(formatR(-0.4)).toBe("-0.4R");
    expect(formatR(0)).toBe("+0R");
  });
});
