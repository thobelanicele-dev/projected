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

export type StrategyParams = MaCrossoverParams | BreakoutParams | RsiParams;

export interface ExitRules {
  stopLossPct: number;
  takeProfitPct: number;
  maxHoldingDays?: number;
  /** Round-trip trading cost (spread + slippage + commission) as % of entry price, charged on every trade regardless of outcome. */
  costPct?: number;
}

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

function generateSignals(candles: Candle[], strategy: StrategyParams): Signal[] {
  switch (strategy.type) {
    case "ma_crossover":
      return maCrossoverSignals(candles, strategy);
    case "breakout":
      return breakoutSignals(candles, strategy);
    case "rsi":
      return rsiSignals(candles, strategy);
  }
}

function simulateTrades(candles: Candle[], signals: Signal[], exitRules: ExitRules): SimulatedTrade[] {
  const trades: SimulatedTrade[] = [];
  let blockedUntilIndex = -1;

  for (const signal of signals) {
    const entryIndex = signal.index + 1;
    if (entryIndex >= candles.length || entryIndex <= blockedUntilIndex) continue;

    const entryCandle = candles[entryIndex];
    const entryPrice = entryCandle.open;
    const stopPrice =
      signal.direction === "long"
        ? entryPrice * (1 - exitRules.stopLossPct / 100)
        : entryPrice * (1 + exitRules.stopLossPct / 100);
    const targetPrice =
      signal.direction === "long"
        ? entryPrice * (1 + exitRules.takeProfitPct / 100)
        : entryPrice * (1 - exitRules.takeProfitPct / 100);

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
    // Every trade pays the spread on entry and exit regardless of outcome —
    // a "breakeven" signal is actually a small loss in real trading.
    const pnlPct = rawPnlPct - (exitRules.costPct ?? 0);
    const rMultiple = Math.round((pnlPct / exitRules.stopLossPct) * 100) / 100;

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
