import { describe, expect, it } from "vitest";
import {
  atr,
  bollingerSignals,
  computeStopAndTarget,
  macdSignals,
  runBacktest,
  type Candle,
} from "./backtestEngine";

function makeFlatCandles(count: number, price: number, range = 2): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, "0")}`,
    open: price,
    high: price + range / 2,
    low: price - range / 2,
    close: price,
  }));
}

describe("atr", () => {
  it("settles at the constant true range once the period has enough bars", () => {
    const candles = makeFlatCandles(20, 100, 2);
    const values = atr(candles, 14);
    expect(values[13]).toBeCloseTo(2, 5);
  });
});

describe("computeStopAndTarget", () => {
  it("atr mode: stop distance is atrMultiple x ATR, target is rewardMultiple x that", () => {
    const candles = makeFlatCandles(20, 100, 2);
    const result = computeStopAndTarget(candles, 14, "long", 100, {
      mode: "atr",
      atrPeriod: 14,
      stopAtrMultiple: 1.5,
      rewardMultiple: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.stopPrice).toBeCloseTo(100 - 2 * 1.5, 5);
    expect(result!.targetPrice).toBeCloseTo(100 + 2 * 1.5 * 2, 5);
    expect(result!.riskPct).toBeCloseTo(3, 5);
  });

  it("structural mode: stop is placed at the real swing low/high over the lookback window", () => {
    const candles: Candle[] = [
      { date: "d0", open: 99, high: 99, low: 98, close: 99 },
      { date: "d1", open: 99, high: 99, low: 97, close: 99 },
      { date: "d2", open: 99, high: 99, low: 90, close: 99 }, // the swing low
      { date: "d3", open: 99, high: 99, low: 96, close: 99 },
      { date: "d4", open: 99, high: 99, low: 95, close: 99 },
    ];
    const result = computeStopAndTarget(candles, 5, "long", 100, {
      mode: "structural",
      swingLookback: 5,
      rewardMultiple: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.stopPrice).toBeCloseTo(90, 5);
    expect(result!.riskPct).toBeCloseTo(10, 5); // (100 - 90) / 100 * 100
    expect(result!.targetPrice).toBeCloseTo(100 + 10 * 2, 5);
  });

  it("returns null instead of a zero/negative-risk trade when the stop coincides with entry", () => {
    const candles: Candle[] = Array.from({ length: 5 }, (_, i) => ({
      date: `d${i}`,
      open: 100,
      high: 100,
      low: 100, // swing low equals the entry price used below
      close: 100,
    }));
    const result = computeStopAndTarget(candles, 5, "long", 100, {
      mode: "structural",
      swingLookback: 5,
      rewardMultiple: 2,
    });
    expect(result).toBeNull();
  });

  it("percent mode still works exactly as before", () => {
    const result = computeStopAndTarget([], 0, "short", 100, {
      mode: "percent",
      stopLossPct: 2,
      takeProfitPct: 6,
    });
    expect(result).toEqual({ stopPrice: 102, targetPrice: 94, riskPct: 2 });
  });
});

describe("bollingerSignals", () => {
  it("fires a long signal when price closes below the lower band", () => {
    const closes = [...Array(21).fill(100), 80];
    const candles: Candle[] = closes.map((c, i) => ({
      date: `d${i}`,
      open: c,
      high: c,
      low: c,
      close: c,
    }));
    const signals = bollingerSignals(candles, { type: "bollinger", period: 10, stdDevMultiplier: 2 });
    expect(signals.some((s) => s.direction === "long" && s.index === candles.length - 1)).toBe(true);
  });
});

describe("macdSignals", () => {
  it("fires both long and short signals on an oscillating price series", () => {
    // A slow sine wave gives MACD/signal repeated, unambiguous crossovers in
    // both directions, more robust than hand-deriving a single clean cross.
    const closes = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 15) * 10);
    const candles: Candle[] = closes.map((c, i) => ({
      date: `d${i}`,
      open: c,
      high: c,
      low: c,
      close: c,
    }));
    const signals = macdSignals(candles, { type: "macd", fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    expect(signals.some((s) => s.direction === "long")).toBe(true);
    expect(signals.some((s) => s.direction === "short")).toBe(true);
  });
});

describe("runBacktest with the structural exit mode", () => {
  it("never produces a NaN or Infinite R-multiple even on a choppy series", () => {
    const candles = Array.from({ length: 60 }, (_, i) => {
      const base = 100 + Math.sin(i / 3) * 5;
      return { date: `d${i}`, open: base, high: base + 1, low: base - 1, close: base + Math.cos(i) * 0.5 };
    });
    const result = runBacktest(
      candles,
      { type: "ma_crossover", fastPeriod: 3, slowPeriod: 8, maKind: "sma" },
      { mode: "structural", swingLookback: 5, rewardMultiple: 2 }
    );
    for (const trade of result.trades) {
      expect(Number.isFinite(trade.rMultiple)).toBe(true);
    }
  });
});
