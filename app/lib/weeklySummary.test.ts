import { describe, expect, it } from "vitest";
import type { JournalEntry } from "@/app/lib/journal";
import type { TradePlan } from "@/app/api/plan/route";
import {
  addWeeks,
  buildSummaryText,
  computeBestDayToTrade,
  computePeriodSummary,
  computeWeeklySummary,
  customPeriod,
  formatPeriodRange,
  formatR,
  monthPeriod,
  shiftPeriod,
  startOfWeek,
  weekPeriod,
  yearPeriod,
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

// `trade({ day })` counts days from Monday 19 October 2026, so day -18 is 1 October.
describe("a month", () => {
  const october = monthPeriod(at(0));

  it("runs from the 1st to the last day of the calendar month", () => {
    expect(october.start).toBe(new Date(2026, 9, 1).getTime());
    expect(october.end).toBe(new Date(2026, 10, 1).getTime());
    expect(formatPeriodRange(october)).toBe("October 2026");
  });

  it("counts the month's trades and leaves out the ones either side", () => {
    const s = computePeriodSummary(
      [
        trade({ day: -18, rMultiple: 1 }), // 1 Oct
        trade({ day: 12, rMultiple: 2 }), // 31 Oct
        trade({ day: -19, rMultiple: 5 }), // 30 Sep
        trade({ day: 13, rMultiple: 5 }), // 1 Nov
      ],
      october
    );
    expect(s.closedTrades).toBe(2);
    expect(s.totalR).toBe(3);
    expect(s.previous?.totalR).toBe(5);
  });

  it("draws one bar per week, and trims the first to the start of the month", () => {
    const s = computePeriodSummary([trade({ day: 0, rMultiple: 2 }), trade({ day: -14, rMultiple: -1, outcome: "loss" })], october);
    expect(s.bucketUnit).toBe("week");
    expect(s.buckets.map((b) => b.short)).toEqual(["1 Oct", "5 Oct", "12 Oct", "19 Oct", "26 Oct"]);
    expect(s.buckets.map((b) => b.totalR)).toEqual([0, -1, 0, 2, 0]);
    expect(s.bestBucketIndex).toBe(3);
  });

  it("names days by their date, since a month has more than one Monday", () => {
    const s = computePeriodSummary(
      [0, 0, 0, 0].map((day) => trade({ day, rMultiple: -1, outcome: "loss" })),
      october
    );
    expect(s.worstDay?.name).toBe("Mon 19 Oct");
    expect(s.insights.find((i) => i.id === "overtrading")?.title).toBe("Too many trades on Mon 19 Oct");
  });

  it("talks about the month, not the week", () => {
    const s = computePeriodSummary([trade({ day: 0, rMultiple: 2 }), trade({ day: 1, rMultiple: 1 }), trade({ day: -30, rMultiple: 0.5 })], october);
    const titles = s.insights.map((i) => i.title);
    expect(titles).toContain("A profitable month");
    expect(titles).toContain("Better than last month");
    expect(buildSummaryText(s).split("\n")[0]).toBe("My trading month: October 2026");
  });
});

describe("a year", () => {
  const y2026 = yearPeriod(at(0));

  it("runs from 1 January to 31 December", () => {
    expect(y2026.start).toBe(new Date(2026, 0, 1).getTime());
    expect(y2026.end).toBe(new Date(2027, 0, 1).getTime());
    expect(formatPeriodRange(y2026)).toBe("2026");
  });

  it("draws one bar per month and compares with the year before", () => {
    const s = computePeriodSummary([trade({ day: 0, rMultiple: 2 }), trade({ day: -365, rMultiple: 1 })], y2026);
    expect(s.bucketUnit).toBe("month");
    expect(s.buckets).toHaveLength(12);
    expect(s.buckets[0].short).toBe("Jan");
    expect(s.buckets[9].short).toBe("Oct");
    expect(s.buckets[9].name).toBe("October 2026");
    expect(s.buckets[9].totalR).toBe(2);
    expect(s.closedTrades).toBe(1);
    expect(s.previous?.totalR).toBe(1);
    expect(buildSummaryText(s).split("\n")[0]).toBe("My trading year: 2026");
  });
});

describe("dates you pick", () => {
  it("includes both the first and the last day, whichever order they're given in", () => {
    const period = customPeriod(at(0), at(2));
    expect(customPeriod(at(2), at(0))).toEqual(period);
    expect(formatPeriodRange(period)).toBe("19 Oct 2026 to 21 Oct 2026");

    const s = computePeriodSummary(
      [
        trade({ day: 0, rMultiple: 1 }),
        trade({ day: 2, rMultiple: 1, closedAt: at(2, 23) }),
        trade({ day: 3, rMultiple: 9 }),
        trade({ day: -1, rMultiple: 4 }),
      ],
      period
    );
    expect(s.closedTrades).toBe(2);
    // The period before is the same number of days, straight before it.
    expect(s.previous?.totalR).toBe(4);
    expect(s.bucketUnit).toBe("day");
    expect(s.buckets.map((b) => b.short)).toEqual(["19 Oct", "20 Oct", "21 Oct"]);
  });

  it("works for a single day", () => {
    const period = customPeriod(at(0), at(0, 18));
    expect(formatPeriodRange(period)).toBe("19 Oct 2026");
    expect(computePeriodSummary([trade({ day: 0 }), trade({ day: 1 })], period).closedTrades).toBe(1);
  });

  it("uses bigger bars for longer stretches, so the chart stays readable", () => {
    const unit = (days: number) => computePeriodSummary([], customPeriod(at(0), at(days - 1))).bucketUnit;
    expect(unit(14)).toBe("day");
    expect(unit(60)).toBe("week");
    expect(unit(300)).toBe("month");
    expect(unit(1200)).toBe("year");
    expect(computePeriodSummary([], customPeriod(at(0), at(1199))).buckets.length).toBeLessThanOrEqual(14);
  });

  it("says which year a month belongs to when the dates cross New Year", () => {
    const s = computePeriodSummary([], customPeriod(new Date(2026, 10, 1), new Date(2027, 1, 28)));
    expect(s.buckets.map((b) => b.short)).toEqual(["Nov 26", "Dec 26", "Jan 27", "Feb 27"]);
  });

  it("talks about the period", () => {
    const s = computePeriodSummary([trade({ day: 0, rMultiple: 2 }), trade({ day: 1, rMultiple: 1 })], customPeriod(at(0), at(9)));
    expect(s.insights.map((i) => i.title)).toContain("A profitable period");
    expect(buildSummaryText(s).split("\n")[0]).toBe("My trading, 19 Oct 2026 to 28 Oct 2026");
  });
});

describe("stepping back and forward", () => {
  it("moves a week, a month or a year at a time", () => {
    expect(shiftPeriod(weekPeriod(at(0)), -1).start).toBe(addWeeks(MON, -1));
    expect(formatPeriodRange(shiftPeriod(monthPeriod(new Date(2026, 0, 15)), -1))).toBe("December 2025");
    expect(formatPeriodRange(shiftPeriod(monthPeriod(new Date(2026, 0, 31)), 1))).toBe("February 2026");
    expect(formatPeriodRange(shiftPeriod(yearPeriod(at(0)), 1))).toBe("2027");
  });

  it("gives the same week whether asked through the old or the new way", () => {
    const entries = [trade({ day: 0, rMultiple: 2 }), trade({ day: 4, rMultiple: -1, outcome: "loss" })];
    expect(computePeriodSummary(entries, weekPeriod(at(3)))).toEqual(computeWeeklySummary(entries, MON));
  });
});
