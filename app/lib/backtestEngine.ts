export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MaCrossoverParams {
  type: "ma_crossover";
  fastPeriod: number;
  slowPeriod: number;
  maKind: "sma" | "ema";
}

export interface BreakoutParams {
  type: "breakout";
  lookbackDays: number;
}

export interface RsiParams {
  type: "rsi";
  period: number;
  oversold: number;
  overbought: number;
}

export interface BollingerParams {
  type: "bollinger";
  period: number;
  stdDevMultiplier: number;
}

export interface MacdParams {
  type: "macd";
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export type StrategyParams = MaCrossoverParams | BreakoutParams | RsiParams | BollingerParams | MacdParams;

interface BaseExitRules {
  maxHoldingDays?: number;
  /** Round-trip trading cost (spread + slippage + commission) as % of entry price, charged on every trade regardless of outcome. */
  costPct?: number;
}

export type ExitRules =
  | (BaseExitRules & { mode: "percent"; stopLossPct: number; takeProfitPct: number })
  | (BaseExitRules & { mode: "atr"; atrPeriod: number; stopAtrMultiple: number; rewardMultiple: number })
  | (BaseExitRules & { mode: "structural"; swingLookback: number; rewardMultiple: number });

export interface SimulatedTrade {
  direction: "long" | "short";
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  exitReason: "stop" | "target" | "time" | "end_of_data";
  rMultiple: number;
  pnlPct: number;
}

export interface BacktestStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgR: number | null;
  profitFactor: number | null;
  maxDrawdownR: number | null;
  equityCurve: { date: string; cumulativeR: number }[];
}

export interface BacktestResult {
  trades: SimulatedTrade[];
  stats: BacktestStats;
}

interface Signal {
  index: number;
  direction: "long" | "short";
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      const seed = values.slice(i - period + 1, i + 1);
      prev = seed.reduce((a, b) => a + b, 0) / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

function rollingStdDev(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    const window = values.slice(i - period + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / period;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    out.push(Math.sqrt(variance));
  }
  return out;
}

// Simplified ATR: true range smoothed with a plain moving average rather than
// Wilder's exact recursive smoothing. Close enough for a stop/target distance,
// not presented as a precise technical-analysis figure.
export function atr(candles: Candle[], period: number): (number | null)[] {
  const trueRanges = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
  return sma(trueRanges, period);
}

function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function maCrossoverSignals(candles: Candle[], params: MaCrossoverParams): Signal[] {
  const closes = candles.map((c) => c.close);
  const maFn = params.maKind === "ema" ? ema : sma;
  const fast = maFn(closes, params.fastPeriod);
  const slow = maFn(closes, params.slowPeriod);

  const signals: Signal[] = [];
  for (let i = 1; i < candles.length; i++) {
    const f0 = fast[i - 1];
    const f1 = fast[i];
    const s0 = slow[i - 1];
    const s1 = slow[i];
    if (f0 === null || f1 === null || s0 === null || s1 === null) continue;
    if (f0 <= s0 && f1 > s1) signals.push({ index: i, direction: "long" });
    else if (f0 >= s0 && f1 < s1) signals.push({ index: i, direction: "short" });
  }
  return signals;
}

function breakoutSignals(candles: Candle[], params: BreakoutParams): Signal[] {
  const signals: Signal[] = [];
  for (let i = params.lookbackDays; i < candles.length; i++) {
    const window = candles.slice(i - params.lookbackDays, i);
    const highestHigh = Math.max(...window.map((c) => c.high));
    const lowestLow = Math.min(...window.map((c) => c.low));
    if (candles[i].close > highestHigh) signals.push({ index: i, direction: "long" });
    else if (candles[i].close < lowestLow) signals.push({ index: i, direction: "short" });
  }
  return signals;
}

function rsiSignals(candles: Candle[], params: RsiParams): Signal[] {
  const closes = candles.map((c) => c.close);
  const values = rsi(closes, params.period);

  const signals: Signal[] = [];
  for (let i = 1; i < candles.length; i++) {
    const r0 = values[i - 1];
    const r1 = values[i];
    if (r0 === null || r1 === null) continue;
    if (r0 >= params.oversold && r1 < params.oversold) signals.push({ index: i, direction: "long" });
    else if (r0 <= params.overbought && r1 > params.overbought) signals.push({ index: i, direction: "short" });
  }
  return signals;
}

export function bollingerSignals(candles: Candle[], params: BollingerParams): Signal[] {
  const closes = candles.map((c) => c.close);
  const mean = sma(closes, params.period);
  const stdDev = rollingStdDev(closes, params.period);

  const signals: Signal[] = [];
  for (let i = 1; i < candles.length; i++) {
    const m = mean[i];
    const s = stdDev[i];
    if (m === null || s === null) continue;
    const upper = m + params.stdDevMultiplier * s;
    const lower = m - params.stdDevMultiplier * s;
    const prevClose = closes[i - 1];
    const currClose = closes[i];
    if (prevClose >= lower && currClose < lower) signals.push({ index: i, direction: "long" });
    else if (prevClose <= upper && currClose > upper) signals.push({ index: i, direction: "short" });
  }
  return signals;
}

export function macdSignals(candles: Candle[], params: MacdParams): Signal[] {
  const closes = candles.map((c) => c.close);
  const fastEma = ema(closes, params.fastPeriod);
  const slowEma = ema(closes, params.slowPeriod);
  const macdLine = closes.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? fastEma[i]! - slowEma[i]! : null
  );

  // The signal line is an EMA "of" the MACD line, which itself starts with a
  // run of nulls (the slow EMA's warm-up). Compute the EMA over just the
  // non-null suffix, then re-align it back to the full-length array.
  const firstValidIndex = macdLine.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = new Array(macdLine.length).fill(null);
  if (firstValidIndex !== -1) {
    const suffix = macdLine.slice(firstValidIndex) as number[];
    const suffixSignal = ema(suffix, params.signalPeriod);
    suffixSignal.forEach((v, j) => {
      signalLine[firstValidIndex + j] = v;
    });
  }

  const signals: Signal[] = [];
  for (let i = 1; i < candles.length; i++) {
    const m0 = macdLine[i - 1];
    const m1 = macdLine[i];
    const s0 = signalLine[i - 1];
    const s1 = signalLine[i];
    if (m0 === null || m1 === null || s0 === null || s1 === null) continue;
    if (m0 <= s0 && m1 > s1) signals.push({ index: i, direction: "long" });
    else if (m0 >= s0 && m1 < s1) signals.push({ index: i, direction: "short" });
  }
  return signals;
}

function generateSignals(candles: Candle[], strategy: StrategyParams): Signal[] {
  switch (strategy.type) {
    case "ma_crossover":
      return maCrossoverSignals(candles, strategy);
    case "breakout":
      return breakoutSignals(candles, strategy);
    case "rsi":
      return rsiSignals(candles, strategy);
    case "bollinger":
      return bollingerSignals(candles, strategy);
    case "macd":
      return macdSignals(candles, strategy);
  }
}

// Returns null when the computed stop distance is zero or negative (e.g. a
// swing high/low that coincides with the entry price) — that setup can't
// produce a meaningful R-multiple, so the caller skips the trade entirely
// rather than dividing by zero.
export function computeStopAndTarget(
  candles: Candle[],
  entryIndex: number,
  direction: "long" | "short",
  entryPrice: number,
  exitRules: ExitRules
): { stopPrice: number; targetPrice: number; riskPct: number } | null {
  if (exitRules.mode === "percent") {
    const stopPrice =
      direction === "long"
        ? entryPrice * (1 - exitRules.stopLossPct / 100)
        : entryPrice * (1 + exitRules.stopLossPct / 100);
    const targetPrice =
      direction === "long"
        ? entryPrice * (1 + exitRules.takeProfitPct / 100)
        : entryPrice * (1 - exitRules.takeProfitPct / 100);
    if (exitRules.stopLossPct <= 0) return null;
    return { stopPrice, targetPrice, riskPct: exitRules.stopLossPct };
  }

  if (exitRules.mode === "atr") {
    const atrValues = atr(candles, exitRules.atrPeriod);
    const atrAtEntry = atrValues[entryIndex - 1];
    if (atrAtEntry === null || atrAtEntry === undefined || atrAtEntry <= 0) return null;
    const stopDistance = atrAtEntry * exitRules.stopAtrMultiple;
    const targetDistance = stopDistance * exitRules.rewardMultiple;
    const stopPrice = direction === "long" ? entryPrice - stopDistance : entryPrice + stopDistance;
    const targetPrice = direction === "long" ? entryPrice + targetDistance : entryPrice - targetDistance;
    const riskPct = (stopDistance / entryPrice) * 100;
    return riskPct > 0 ? { stopPrice, targetPrice, riskPct } : null;
  }

  // structural
  const windowStart = Math.max(0, entryIndex - exitRules.swingLookback);
  const window = candles.slice(windowStart, entryIndex);
  if (window.length === 0) return null;
  const swingLow = Math.min(...window.map((c) => c.low));
  const swingHigh = Math.max(...window.map((c) => c.high));
  const stopPrice = direction === "long" ? swingLow : swingHigh;
  const stopDistance = Math.abs(entryPrice - stopPrice);
  const targetDistance = stopDistance * exitRules.rewardMultiple;
  const targetPrice = direction === "long" ? entryPrice + targetDistance : entryPrice - targetDistance;
  const riskPct = (stopDistance / entryPrice) * 100;
  return riskPct > 0 ? { stopPrice, targetPrice, riskPct } : null;
}

function simulateTrades(candles: Candle[], signals: Signal[], exitRules: ExitRules): SimulatedTrade[] {
  const trades: SimulatedTrade[] = [];
  let blockedUntilIndex = -1;

  for (const signal of signals) {
    const entryIndex = signal.index + 1;
    if (entryIndex >= candles.length || entryIndex <= blockedUntilIndex) continue;

    const entryCandle = candles[entryIndex];
    const entryPrice = entryCandle.open;
    const exit = computeStopAndTarget(candles, entryIndex, signal.direction, entryPrice, exitRules);
    if (exit === null) continue;
    const { stopPrice, targetPrice, riskPct } = exit;

    const maxIndex = exitRules.maxHoldingDays
      ? Math.min(candles.length - 1, entryIndex + exitRules.maxHoldingDays)
      : candles.length - 1;

    let exitIndex = candles.length - 1;
    let exitPrice = candles[exitIndex].close;
    let exitReason: SimulatedTrade["exitReason"] = "end_of_data";

    for (let j = entryIndex; j <= maxIndex; j++) {
      const bar = candles[j];
      if (signal.direction === "long") {
        if (bar.low <= stopPrice) {
          exitIndex = j;
          exitPrice = stopPrice;
          exitReason = "stop";
          break;
        }
        if (bar.high >= targetPrice) {
          exitIndex = j;
          exitPrice = targetPrice;
          exitReason = "target";
          break;
        }
      } else {
        if (bar.high >= stopPrice) {
          exitIndex = j;
          exitPrice = stopPrice;
          exitReason = "stop";
          break;
        }
        if (bar.low <= targetPrice) {
          exitIndex = j;
          exitPrice = targetPrice;
          exitReason = "target";
          break;
        }
      }
      if (j === maxIndex && exitRules.maxHoldingDays) {
        exitIndex = j;
        exitPrice = bar.close;
        exitReason = "time";
      }
    }

    const rawPnlPct =
      signal.direction === "long"
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100;
    // Every trade pays the spread on entry and exit regardless of outcome, so
    // a "breakeven" signal is actually a small loss in real trading.
    const pnlPct = rawPnlPct - (exitRules.costPct ?? 0);
    const rMultiple = Math.round((pnlPct / riskPct) * 100) / 100;

    trades.push({
      direction: signal.direction,
      entryDate: entryCandle.date,
      entryPrice: Math.round(entryPrice * 100000) / 100000,
      exitDate: candles[exitIndex].date,
      exitPrice: Math.round(exitPrice * 100000) / 100000,
      exitReason,
      rMultiple,
      pnlPct: Math.round(pnlPct * 100) / 100,
    });

    blockedUntilIndex = exitIndex;
  }

  return trades;
}

function computeBacktestStats(trades: SimulatedTrade[]): BacktestStats {
  const wins = trades.filter((t) => t.rMultiple > 0).length;
  const losses = trades.filter((t) => t.rMultiple < 0).length;
  const rValues = trades.map((t) => t.rMultiple);

  const grossWin = trades.filter((t) => t.rMultiple > 0).reduce((a, t) => a + t.rMultiple, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.rMultiple < 0).reduce((a, t) => a + t.rMultiple, 0));

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equityCurve = trades.map((t) => {
    cumulative += t.rMultiple;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.min(maxDrawdown, cumulative - peak);
    return { date: t.exitDate, cumulativeR: Math.round(cumulative * 100) / 100 };
  });

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) : null,
    avgR:
      rValues.length > 0
        ? Math.round((rValues.reduce((a, b) => a + b, 0) / rValues.length) * 100) / 100
        : null,
    profitFactor: grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : null,
    maxDrawdownR: trades.length > 0 ? Math.round(Math.abs(maxDrawdown) * 100) / 100 : null,
    equityCurve,
  };
}

export function runBacktest(
  candles: Candle[],
  strategy: StrategyParams,
  exitRules: ExitRules
): BacktestResult {
  const signals = generateSignals(candles, strategy);
  const trades = simulateTrades(candles, signals, exitRules);
  const stats = computeBacktestStats(trades);
  return { trades, stats };
}
