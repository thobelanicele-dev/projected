import { describe, expect, it } from "vitest";
import { reconstructFieldsFromEntry, type JournalEntry } from "./journal";
import { emptyFields, type TradeIdeaFields } from "@/app/components/TradeIdeaForm";
import type { TradePlan } from "@/app/api/plan/route";

const basePlan: TradePlan = {
  instrument: "EUR/USD",
  direction: "long",
  entry: { type: "limit", price: 1.085, condition: "breaks above the recent high", confirmation: "" },
  stopLoss: { price: 1.08, reasoning: "below recent structure", invalidation: "the breakout failed" },
  takeProfits: [{ price: 1.095, reasoning: "measured move target" }],
  riskRewardRatio: 2,
  ruleChecks: [],
  biasFlags: [],
  keyRisks: [],
  watchFor: [],
  summary: "",
  chartCheck: null,
};

const baseEntry: JournalEntry = {
  id: "1",
  createdAt: Date.now(),
  source: "planner",
  instrument: "EUR/USD",
  direction: "long",
  status: "planned",
};

describe("reconstructFieldsFromEntry", () => {
  it("returns the stored fields verbatim when present", () => {
    const storedFields: TradeIdeaFields = { ...emptyFields, pair: "GBP/USD", riskPercent: "2" };
    const entry: JournalEntry = { ...baseEntry, fields: storedFields, plan: basePlan };

    expect(reconstructFieldsFromEntry(entry, emptyFields)).toBe(storedFields);
  });

  it("reconstructs numeric levels from the plan when no fields were stored", () => {
    const entry: JournalEntry = { ...baseEntry, plan: basePlan };

    const result = reconstructFieldsFromEntry(entry, emptyFields);

    expect(result).not.toBeNull();
    expect(result?.pair).toBe("EUR/USD");
    expect(result?.direction).toBe("long");
    expect(result?.entryMode).toBe("condition");
    expect(result?.entryPrice).toBe("1.085");
    expect(result?.stopLossPrice).toBe("1.08");
    expect(result?.takeProfitPrice).toBe("1.095");
  });

  it("falls back to market entry when the plan's entry price is null", () => {
    const plan: TradePlan = { ...basePlan, entry: { ...basePlan.entry, price: null } };
    const entry: JournalEntry = { ...baseEntry, plan };

    const result = reconstructFieldsFromEntry(entry, emptyFields);

    expect(result?.entryMode).toBe("now");
    expect(result?.entryPrice).toBe("");
  });

  it("returns null when the entry has neither stored fields nor a plan", () => {
    expect(reconstructFieldsFromEntry(baseEntry, emptyFields)).toBeNull();
  });
});
