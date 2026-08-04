export type AccountCurrency = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "NZD";

export const ACCOUNT_CURRENCIES: AccountCurrency[] = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
];

export type RiskMode = "percent" | "fixed";
export type LotConvention = "standard" | "mini" | "micro" | "nano";

export const LOT_SIZES: Record<LotConvention, number> = {
  standard: 100000,
  mini: 10000,
  micro: 1000,
  nano: 100,
};

export const LOT_LABELS: Record<LotConvention, string> = {
  standard: "Standard (100,000)",
  mini: "Mini (10,000)",
  micro: "Micro (1,000)",
  nano: "Nano (100)",
};

export interface SharedInputs {
  accountBalance: number;
  accountCurrency: AccountCurrency;
  riskMode: RiskMode;
  riskValue: number;
  lotConvention: LotConvention;
}

export const DEFAULT_SHARED_INPUTS: SharedInputs = {
  accountBalance: 10000,
  accountCurrency: "USD",
  riskMode: "percent",
  riskValue: 1,
  lotConvention: "standard",
};

export type FieldErrors = Record<string, string>;

export type CalcOutcome<T> =
  | { ok: true; result: T; warnings: string[] }
  | { ok: false; errors: FieldErrors };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parsePair(pair: string): { base: string; quote: string } | null {
  const parts = pair
    .trim()
    .toUpperCase()
    .split("/")
    .map((p) => p.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { base: parts[0], quote: parts[1] };
}

export function getPipSize(quoteCurrency: string): number {
  return quoteCurrency.toUpperCase() === "JPY" ? 0.01 : 0.0001;
}

export type ConversionCase = "quote-match" | "base-match" | "cross";

export function classifyConversionCase(
  pair: { base: string; quote: string },
  accountCurrency: string
): ConversionCase {
  if (pair.quote === accountCurrency) return "quote-match";
  if (pair.base === accountCurrency) return "base-match";
  return "cross";
}

function validateBalance(balance: number, errors: FieldErrors, key = "accountBalance") {
  if (!(balance > 0)) errors[key] = "Account balance must be greater than zero.";
}

function validateRate(rate: number, errors: FieldErrors, key: string, label: string) {
  if (!(rate > 0)) errors[key] = `${label} must be greater than zero.`;
}

// --- 3.2 Pip value ---------------------------------------------------------

export interface PipValueInput {
  pair: string;
  accountCurrency: AccountCurrency;
  lotConvention: LotConvention;
  exchangeRate: number;
  conversionRate?: number;
}

export interface PipValueResult {
  pipSize: number;
  pipValue: number;
  conversionCase: ConversionCase;
}

export function calculatePipValue(input: PipValueInput): CalcOutcome<PipValueResult> {
  const errors: FieldErrors = {};
  const parsed = parsePair(input.pair);
  if (!parsed) {
    errors.pair = "Enter a pair as BASE/QUOTE, e.g. EUR/USD.";
  }
  validateRate(input.exchangeRate, errors, "exchangeRate", "Exchange rate");

  if (Object.keys(errors).length > 0 || !parsed) return { ok: false, errors };

  const pipSize = getPipSize(parsed.quote);
  const lotSize = LOT_SIZES[input.lotConvention];
  const conversionCase = classifyConversionCase(parsed, input.accountCurrency);

  let pipValue: number;
  if (conversionCase === "quote-match") {
    pipValue = pipSize * lotSize;
  } else if (conversionCase === "base-match") {
    pipValue = (pipSize * lotSize) / input.exchangeRate;
  } else {
    if (!input.conversionRate || !(input.conversionRate > 0)) {
      return {
        ok: false,
        errors: {
          conversionRate: `${parsed.quote}/${input.accountCurrency} conversion rate is required for this pair.`,
        },
      };
    }
    pipValue = pipSize * lotSize * input.conversionRate;
  }

  return {
    ok: true,
    result: { pipSize, pipValue: round2(pipValue), conversionCase },
    warnings: [],
  };
}

// --- 3.1 Position size -------------------------------------------------------

export interface PositionSizeInput {
  pair: string;
  stopLossPips: number;
  exchangeRate: number;
  conversionRate?: number;
  shared: SharedInputs;
}

export interface PositionSizeResult {
  riskAmount: number;
  pipValue: number;
  positionLots: number;
  positionUnits: number;
  conversionCase: ConversionCase;
  highRiskWarning: boolean;
}

export function calculatePositionSize(input: PositionSizeInput): CalcOutcome<PositionSizeResult> {
  const errors: FieldErrors = {};
  const { shared } = input;

  validateBalance(shared.accountBalance, errors);
  if (!(shared.riskValue > 0)) {
    errors.riskValue =
      shared.riskMode === "percent"
        ? "Risk % must be greater than zero."
        : "Risk amount must be greater than zero.";
  }
  if (!(input.stopLossPips > 0)) {
    errors.stopLossPips = "Stop loss (pips) must be greater than zero.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const pipValueOutcome = calculatePipValue({
    pair: input.pair,
    accountCurrency: shared.accountCurrency,
    lotConvention: shared.lotConvention,
    exchangeRate: input.exchangeRate,
    conversionRate: input.conversionRate,
  });

  if (!pipValueOutcome.ok) return pipValueOutcome;

  const riskAmount =
    shared.riskMode === "percent"
      ? shared.accountBalance * (shared.riskValue / 100)
      : shared.riskValue;

  const { pipValue, conversionCase } = pipValueOutcome.result;
  const positionLots = round2(riskAmount / (input.stopLossPips * pipValue));
  const positionUnits = positionLots * LOT_SIZES[shared.lotConvention];
  const effectiveRiskPercent = (riskAmount / shared.accountBalance) * 100;

  const warnings: string[] = [];
  if (effectiveRiskPercent > 3) {
    warnings.push(
      `Risking ${round2(effectiveRiskPercent)}% of the account on this trade exceeds commonly recommended risk limits.`
    );
  }

  return {
    ok: true,
    result: {
      riskAmount: round2(riskAmount),
      pipValue,
      positionLots,
      positionUnits,
      conversionCase,
      highRiskWarning: effectiveRiskPercent > 3,
    },
    warnings,
  };
}

// --- 3.3 Risk/reward ---------------------------------------------------------

export type RiskRewardInput =
  | { mode: "prices"; pair: string; entry: number; stopLoss: number; takeProfit: number }
  | { mode: "pips"; riskPips: number; rewardPips: number };

export interface RiskRewardResult {
  riskPips: number;
  rewardPips: number;
  ratio: number;
  breakevenWinRate: number;
}

export function calculateRiskReward(input: RiskRewardInput): CalcOutcome<RiskRewardResult> {
  const errors: FieldErrors = {};
  let riskPips: number;
  let rewardPips: number;

  if (input.mode === "prices") {
    const parsed = parsePair(input.pair);
    if (!parsed) errors.pair = "Enter a pair as BASE/QUOTE, e.g. EUR/USD.";
    if (!(input.entry > 0)) errors.entry = "Entry price must be greater than zero.";
    if (!(input.stopLoss > 0)) errors.stopLoss = "Stop loss price must be greater than zero.";
    if (!(input.takeProfit > 0)) errors.takeProfit = "Take profit price must be greater than zero.";
    if (Object.keys(errors).length > 0 || !parsed) return { ok: false, errors };

    const pipSize = getPipSize(parsed.quote);
    riskPips = Math.abs(input.entry - input.stopLoss) / pipSize;
    rewardPips = Math.abs(input.takeProfit - input.entry) / pipSize;
  } else {
    if (!(input.riskPips > 0)) errors.riskPips = "Risk (pips) must be greater than zero.";
    if (!(input.rewardPips >= 0)) errors.rewardPips = "Reward (pips) can't be negative.";
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    riskPips = input.riskPips;
    rewardPips = input.rewardPips;
  }

  if (riskPips === 0) {
    return {
      ok: false,
      errors: { stopLoss: "Entry and stop loss can't be the same price — risk can't be zero." },
    };
  }

  const ratio = rewardPips / riskPips;
  const breakevenWinRate = (riskPips / (riskPips + rewardPips)) * 100;

  return {
    ok: true,
    result: {
      riskPips: round2(riskPips),
      rewardPips: round2(rewardPips),
      ratio: round2(ratio),
      breakevenWinRate: round2(breakevenWinRate),
    },
    warnings: [],
  };
}

// --- 3.4 Margin & leverage ----------------------------------------------------

export interface MarginInput {
  pair: string;
  exchangeRate: number;
  conversionRate?: number;
  positionUnits: number;
  leverage: number;
  equity: number;
  usedMargin: number;
  accountCurrency: AccountCurrency;
}

export interface MarginResult {
  notionalValue: number;
  requiredMargin: number;
  marginLevelPct: number | null;
  freeMargin: number;
  marginCallWarning: boolean;
  conversionCase: ConversionCase;
}

export function calculateMarginLeverage(input: MarginInput): CalcOutcome<MarginResult> {
  const errors: FieldErrors = {};
  const parsed = parsePair(input.pair);
  if (!parsed) errors.pair = "Enter a pair as BASE/QUOTE, e.g. EUR/USD.";
  validateRate(input.exchangeRate, errors, "exchangeRate", "Exchange rate");
  if (!(input.positionUnits > 0)) errors.positionUnits = "Position size must be greater than zero.";
  if (!(input.leverage > 0)) errors.leverage = "Leverage must be greater than zero.";
  validateBalance(input.equity, errors, "equity");
  if (input.usedMargin < 0) errors.usedMargin = "Used margin can't be negative.";

  if (Object.keys(errors).length > 0 || !parsed) return { ok: false, errors };

  const conversionCase = classifyConversionCase(parsed, input.accountCurrency);

  let notionalValue: number;
  if (conversionCase === "quote-match") {
    notionalValue = input.positionUnits * input.exchangeRate;
  } else if (conversionCase === "base-match") {
    notionalValue = input.positionUnits;
  } else {
    if (!input.conversionRate || !(input.conversionRate > 0)) {
      return {
        ok: false,
        errors: {
          conversionRate: `${parsed.quote}/${input.accountCurrency} conversion rate is required for this pair.`,
        },
      };
    }
    notionalValue = input.positionUnits * input.exchangeRate * input.conversionRate;
  }

  const requiredMargin = notionalValue / input.leverage;
  const marginLevelPct = input.usedMargin > 0 ? (input.equity / input.usedMargin) * 100 : null;
  const freeMargin = input.equity - input.usedMargin;
  const marginCallWarning = marginLevelPct !== null && marginLevelPct < 100;

  const warnings: string[] = [];
  if (marginCallWarning) {
    warnings.push("Margin level is below 100% — this is margin call territory.");
  }

  return {
    ok: true,
    result: {
      notionalValue: round2(notionalValue),
      requiredMargin: round2(requiredMargin),
      marginLevelPct: marginLevelPct === null ? null : round2(marginLevelPct),
      freeMargin: round2(freeMargin),
      marginCallWarning,
      conversionCase,
    },
    warnings,
  };
}

// --- 3.5 Multi-trade correlation risk -----------------------------------------

export interface CorrelationPosition {
  id: string;
  pair: string;
  direction: "long" | "short";
  lots: number;
  dollarRisk: number;
  stopLossPips: number;
}

export interface CurrencyExposure {
  currency: string;
  netLots: number;
}

export interface CorrelationGroup {
  currency: string;
  direction: "long" | "short";
  positionIds: string[];
  combinedNetLots: number;
  combinedRisk: number;
}

export interface CorrelationResult {
  exposures: CurrencyExposure[];
  totalRiskPercent: number;
  correlatedGroups: CorrelationGroup[];
}

export function calculateCorrelationRisk(
  positions: CorrelationPosition[],
  accountBalance: number
): CalcOutcome<CorrelationResult> {
  const errors: FieldErrors = {};
  validateBalance(accountBalance, errors);

  positions.forEach((p, i) => {
    const parsed = parsePair(p.pair);
    if (!parsed) errors[`positions.${i}.pair`] = "Enter a pair as BASE/QUOTE, e.g. EUR/USD.";
    if (!(p.lots > 0)) errors[`positions.${i}.lots`] = "Lot size must be greater than zero.";
    if (!(p.dollarRisk > 0)) errors[`positions.${i}.dollarRisk`] = "Dollar risk must be greater than zero.";
    if (!(p.stopLossPips > 0)) errors[`positions.${i}.stopLossPips`] = "Stop loss (pips) must be greater than zero.";
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  // currency -> list of { positionId, lots (signed), dollarRisk }
  const contributions = new Map<string, { positionId: string; lots: number; dollarRisk: number }[]>();

  for (const p of positions) {
    const parsed = parsePair(p.pair);
    if (!parsed) continue;
    const sign = p.direction === "long" ? 1 : -1;
    const baseLots = sign * p.lots;
    const quoteLots = -sign * p.lots;

    for (const [currency, lots] of [
      [parsed.base, baseLots],
      [parsed.quote, quoteLots],
    ] as [string, number][]) {
      if (!contributions.has(currency)) contributions.set(currency, []);
      contributions.get(currency)!.push({ positionId: p.id, lots, dollarRisk: p.dollarRisk });
    }
  }

  const exposures: CurrencyExposure[] = [];
  const correlatedGroups: CorrelationGroup[] = [];

  for (const [currency, contribs] of contributions) {
    const netLots = round2(contribs.reduce((sum, c) => sum + c.lots, 0));
    exposures.push({ currency, netLots });

    const positiveGroup = contribs.filter((c) => c.lots > 0);
    const negativeGroup = contribs.filter((c) => c.lots < 0);

    for (const [direction, group] of [
      ["long", positiveGroup],
      ["short", negativeGroup],
    ] as ["long" | "short", typeof positiveGroup][]) {
      if (group.length >= 2) {
        correlatedGroups.push({
          currency,
          direction,
          positionIds: group.map((g) => g.positionId),
          combinedNetLots: round2(group.reduce((sum, c) => sum + c.lots, 0)),
          combinedRisk: round2(group.reduce((sum, c) => sum + c.dollarRisk, 0)),
        });
      }
    }
  }

  exposures.sort((a, b) => a.currency.localeCompare(b.currency));

  const totalRiskPercent = round2(
    (positions.reduce((sum, p) => sum + p.dollarRisk, 0) / accountBalance) * 100
  );

  return {
    ok: true,
    result: { exposures, totalRiskPercent, correlatedGroups },
    warnings: correlatedGroups.length > 0 ? ["Correlated exposure detected — see flagged groups below."] : [],
  };
}

// --- Shared-input persistence --------------------------------------------------

const STORAGE_KEY = "fxinsites.riskCalcShared";

export function getStoredSharedInputs(): SharedInputs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharedInputs>;
    return { ...DEFAULT_SHARED_INPUTS, ...parsed };
  } catch {
    return null;
  }
}

export function setStoredSharedInputs(inputs: SharedInputs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
}
