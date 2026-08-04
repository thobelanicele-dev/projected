import { describe, expect, it } from "vitest";
import {
  calculatePipValue,
  calculatePositionSize,
  calculateRiskReward,
  calculateMarginLeverage,
  calculateCorrelationRisk,
  type SharedInputs,
} from "./riskCalculator";

const usdShared: SharedInputs = {
  accountBalance: 10000,
  accountCurrency: "USD",
  riskMode: "percent",
  riskValue: 1,
  lotConvention: "standard",
};

describe("calculatePositionSize (3.1)", () => {
  it("matches the worked example: $10k, 1% risk, EUR/USD, 50 pip stop, USD account", () => {
    const outcome = calculatePositionSize({
      pair: "EUR/USD",
      stopLossPips: 50,
      exchangeRate: 1.085,
      shared: usdShared,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.riskAmount).toBeCloseTo(100, 2);
    expect(outcome.result.pipValue).toBeCloseTo(10, 2);
    expect(outcome.result.positionLots).toBeCloseTo(0.2, 2);
    expect(outcome.result.positionUnits).toBeCloseTo(20000, 2);
  });

  it("rejects a zero pip stop loss instead of dividing by zero", () => {
    const outcome = calculatePositionSize({
      pair: "EUR/USD",
      stopLossPips: 0,
      exchangeRate: 1.085,
      shared: usdShared,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.stopLossPips).toBeTruthy();
  });

  it("flags risk over 3% without blocking the calculation", () => {
    const outcome = calculatePositionSize({
      pair: "EUR/USD",
      stopLossPips: 50,
      exchangeRate: 1.085,
      shared: { ...usdShared, riskValue: 5 },
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.highRiskWarning).toBe(true);
    expect(outcome.warnings.length).toBeGreaterThan(0);
  });
});

describe("calculatePipValue (3.2)", () => {
  it("matches the worked example: USD account, USD/JPY at 155.00", () => {
    const outcome = calculatePipValue({
      pair: "USD/JPY",
      accountCurrency: "USD",
      lotConvention: "standard",
      exchangeRate: 155.0,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.pipValue).toBeCloseTo(6.45, 2);
    expect(outcome.result.conversionCase).toBe("base-match");
  });

  it("uses the quote-match case directly for EUR/USD with a USD account", () => {
    const outcome = calculatePipValue({
      pair: "EUR/USD",
      accountCurrency: "USD",
      lotConvention: "standard",
      exchangeRate: 1.085,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.pipValue).toBeCloseTo(10, 2);
    expect(outcome.result.conversionCase).toBe("quote-match");
  });

  it("requires a conversion rate for a cross pair with no USD leg", () => {
    const outcome = calculatePipValue({
      pair: "EUR/GBP",
      accountCurrency: "USD",
      lotConvention: "standard",
      exchangeRate: 0.86,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.conversionRate).toBeTruthy();
  });

  it("computes the cross case once a conversion rate is supplied", () => {
    const outcome = calculatePipValue({
      pair: "EUR/GBP",
      accountCurrency: "USD",
      lotConvention: "standard",
      exchangeRate: 0.86,
      conversionRate: 1.27, // GBP/USD
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // pipSize 0.0001 * 100000 lot = 10 (in GBP), * 1.27 GBP/USD = 12.7
    expect(outcome.result.pipValue).toBeCloseTo(12.7, 2);
    expect(outcome.result.conversionCase).toBe("cross");
  });
});

describe("calculateRiskReward (3.3)", () => {
  it("matches the worked example: entry 1.1000, SL 1.0950, TP 1.1100", () => {
    const outcome = calculateRiskReward({
      mode: "prices",
      pair: "EUR/USD",
      entry: 1.1,
      stopLoss: 1.095,
      takeProfit: 1.11,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.riskPips).toBeCloseTo(50, 1);
    expect(outcome.result.rewardPips).toBeCloseTo(100, 1);
    expect(outcome.result.ratio).toBeCloseTo(2.0, 2);
    expect(outcome.result.breakevenWinRate).toBeCloseTo(33.3, 1);
  });

  it("supports pip-count input directly", () => {
    const outcome = calculateRiskReward({ mode: "pips", riskPips: 50, rewardPips: 100 });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.ratio).toBeCloseTo(2.0, 2);
    expect(outcome.result.breakevenWinRate).toBeCloseTo(33.3, 1);
  });

  it("rejects entry === stop loss instead of dividing by zero risk", () => {
    const outcome = calculateRiskReward({
      mode: "prices",
      pair: "EUR/USD",
      entry: 1.1,
      stopLoss: 1.1,
      takeProfit: 1.11,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.stopLoss).toBeTruthy();
  });
});

describe("calculateMarginLeverage (3.4)", () => {
  it("matches the worked example: 20,000 units EUR/USD @ 1.1000, 1:100, USD account", () => {
    const outcome = calculateMarginLeverage({
      pair: "EUR/USD",
      exchangeRate: 1.1,
      positionUnits: 20000,
      leverage: 100,
      equity: 10000,
      usedMargin: 0,
      accountCurrency: "USD",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.notionalValue).toBeCloseTo(22000, 2);
    expect(outcome.result.requiredMargin).toBeCloseTo(220, 2);
    expect(outcome.result.marginLevelPct).toBeNull();
  });

  it("flags margin call territory when margin level drops under 100%", () => {
    const outcome = calculateMarginLeverage({
      pair: "EUR/USD",
      exchangeRate: 1.1,
      positionUnits: 20000,
      leverage: 100,
      equity: 150,
      usedMargin: 220,
      accountCurrency: "USD",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.marginLevelPct).toBeCloseTo((150 / 220) * 100, 2);
    expect(outcome.result.marginCallWarning).toBe(true);
  });

  it("rejects zero leverage instead of dividing by zero", () => {
    const outcome = calculateMarginLeverage({
      pair: "EUR/USD",
      exchangeRate: 1.1,
      positionUnits: 20000,
      leverage: 0,
      equity: 10000,
      usedMargin: 0,
      accountCurrency: "USD",
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.leverage).toBeTruthy();
  });
});

describe("calculateCorrelationRisk (3.5)", () => {
  it("matches the worked example: long EUR/USD + long GBP/USD both net-short USD", () => {
    const outcome = calculateCorrelationRisk(
      [
        { id: "1", pair: "EUR/USD", direction: "long", lots: 0.5, dollarRisk: 100, stopLossPips: 50 },
        { id: "2", pair: "GBP/USD", direction: "long", lots: 0.5, dollarRisk: 100, stopLossPips: 50 },
      ],
      10000
    );

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const usdExposure = outcome.result.exposures.find((e) => e.currency === "USD");
    expect(usdExposure?.netLots).toBeCloseTo(-1.0, 2);

    const usdGroup = outcome.result.correlatedGroups.find((g) => g.currency === "USD");
    expect(usdGroup).toBeTruthy();
    expect(usdGroup?.combinedNetLots).toBeCloseTo(-1.0, 2);
    expect(usdGroup?.combinedRisk).toBeCloseTo(200, 2);
    expect(outcome.result.totalRiskPercent).toBeCloseTo(2.0, 2);
  });

  it("rejects a zero account balance instead of dividing by zero", () => {
    const outcome = calculateCorrelationRisk(
      [{ id: "1", pair: "EUR/USD", direction: "long", lots: 0.5, dollarRisk: 100, stopLossPips: 50 }],
      0
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.accountBalance).toBeTruthy();
  });
});
