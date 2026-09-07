import { describe, expect, it } from "vitest";
import { buildReportText } from "./reportExport";
import type { TradePlan } from "@/app/api/plan/route";

const basePlan: TradePlan = {
  instrument: "EUR/USD",
  direction: "long",
  entry: { type: "limit", price: 1.085, condition: "breaks above the recent high", confirmation: "wait for a candle close" },
  stopLoss: { price: 1.08, reasoning: "below recent structure", invalidation: "the breakout failed" },
  takeProfits: [{ price: 1.095, reasoning: "measured move target" }],
  riskRewardRatio: 2,
  ruleChecks: [{ rule: "Defined stop loss", passed: true, note: "" }],
  biasFlags: [],
  keyRisks: [],
  watchFor: [],
  summary: "A reasonable breakout setup.",
  chartCheck: null,
};

describe("buildReportText", () => {
  it("includes the instrument, direction, and summary", () => {
    const text = buildReportText(basePlan);
    expect(text).toContain("EUR/USD");
    expect(text).toContain("Long");
    expect(text).toContain("A reasonable breakout setup.");
  });

  it("includes entry, stop loss, and take profit levels", () => {
    const text = buildReportText(basePlan);
    expect(text).toContain("1.085");
    expect(text).toContain("1.08");
    expect(text).toContain("1.095");
  });

  it("labels multiple take profits individually", () => {
    const plan: TradePlan = {
      ...basePlan,
      takeProfits: [
        { price: 1.09, reasoning: "first target" },
        { price: 1.1, reasoning: "second target" },
      ],
    };
    const text = buildReportText(plan);
    expect(text).toContain("Target 1");
    expect(text).toContain("Target 2");
  });

  it("includes bias flags, key risks, and watch-for items when present", () => {
    const plan: TradePlan = {
      ...basePlan,
      biasFlags: [{ flag: "FOMO", severity: "medium", note: "chasing the move" }],
      keyRisks: ["upcoming news event"],
      watchFor: ["a clean retest"],
    };
    const text = buildReportText(plan);
    expect(text).toContain("FOMO");
    expect(text).toContain("upcoming news event");
    expect(text).toContain("a clean retest");
  });

  it("includes chart-check observations and warnings when present", () => {
    const plan: TradePlan = {
      ...basePlan,
      chartCheck: {
        observations: ["uptrend visible"],
        warnings: ["direction doesn't match the visible trend"],
        levels: { entry: 0.4, stopLoss: 0.6, takeProfits: [0.2] },
      },
    };
    const text = buildReportText(plan);
    expect(text).toContain("uptrend visible");
    expect(text).toContain("direction doesn't match the visible trend");
  });

  it("includes position size stats when provided", () => {
    const text = buildReportText(basePlan, [{ label: "Position size (units)", value: "10,000" }]);
    expect(text).toContain("Position size (units): 10,000");
  });
});
