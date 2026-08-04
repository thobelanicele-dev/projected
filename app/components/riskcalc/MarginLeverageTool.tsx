"use client";

import { useMemo, useState } from "react";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { PairInput } from "@/app/components/riskcalc/PairInput";
import { RiskCalcSummary, type ResultStat } from "@/app/components/RiskCalcSummary";
import { useRiskCalcShared } from "@/app/components/riskcalc/SharedInputsContext";
import { calculateMarginLeverage, LOT_SIZES } from "@/app/lib/riskCalculator";

const LEVERAGE_OPTIONS = [10, 30, 50, 100, 200, 500];

const toggleButtonClass = (active: boolean) =>
  `flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-zinc-500 bg-zinc-800 text-zinc-50"
      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
  }`;

export function MarginLeverageTool() {
  const { shared, lastPositionSizeUnits } = useRiskCalcShared();
  const [pair, setPair] = useState("EUR/USD");
  const [exchangeRate, setExchangeRate] = useState("1.1000");
  const [conversionRate, setConversionRate] = useState("");
  const [sizeMode, setSizeMode] = useState<"lots" | "units">("units");
  const [sizeValue, setSizeValue] = useState("20000");
  const [leverageChoice, setLeverageChoice] = useState<number | "custom">(100);
  const [customLeverage, setCustomLeverage] = useState("100");
  const [equity, setEquity] = useState("10000");
  const [usedMargin, setUsedMargin] = useState("0");

  const positionUnits = useMemo(() => {
    const parsed = parseFloat(sizeValue);
    if (isNaN(parsed)) return NaN;
    return sizeMode === "lots" ? parsed * LOT_SIZES[shared.lotConvention] : parsed;
  }, [sizeValue, sizeMode, shared.lotConvention]);

  const leverage = leverageChoice === "custom" ? parseFloat(customLeverage) : leverageChoice;

  const outcome = useMemo(() => {
    const rate = parseFloat(exchangeRate);
    const conv = conversionRate.trim() ? parseFloat(conversionRate) : undefined;
    const eq = parseFloat(equity);
    const used = parseFloat(usedMargin);
    if (isNaN(rate) || isNaN(positionUnits) || isNaN(leverage) || isNaN(eq) || isNaN(used)) return null;
    return calculateMarginLeverage({
      pair,
      exchangeRate: rate,
      conversionRate: conv,
      positionUnits,
      leverage,
      equity: eq,
      usedMargin: used,
      accountCurrency: shared.accountCurrency,
    });
  }, [pair, exchangeRate, conversionRate, positionUnits, leverage, equity, usedMargin, shared.accountCurrency]);

  const needsConversionRate = !!outcome && !outcome.ok && "conversionRate" in outcome.errors;

  const stats: ResultStat[] | undefined = outcome?.ok
    ? [
        { label: "Notional value", value: `${shared.accountCurrency} ${outcome.result.notionalValue.toLocaleString()}` },
        { label: "Required margin", value: `${shared.accountCurrency} ${outcome.result.requiredMargin.toLocaleString()}` },
        {
          label: "Margin level",
          value: outcome.result.marginLevelPct === null ? "—" : `${outcome.result.marginLevelPct}%`,
          tone: outcome.result.marginCallWarning ? "danger" : "default",
        },
        { label: "Free margin", value: `${shared.accountCurrency} ${outcome.result.freeMargin.toLocaleString()}` },
      ]
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PairInput value={pair} onChange={setPair} />

      <Field label="Exchange rate" hint="Current rate for the pair.">
        <input
          type="text"
          inputMode="decimal"
          value={exchangeRate}
          onChange={(e) => setExchangeRate(e.target.value)}
          className={`${inputClass} max-w-[200px]`}
        />
      </Field>

      {needsConversionRate && (
        <Field
          label={`Conversion rate (quote → ${shared.accountCurrency})`}
          hint="Required because neither leg of this pair is your account currency."
        >
          <input
            type="text"
            inputMode="decimal"
            value={conversionRate}
            onChange={(e) => setConversionRate(e.target.value)}
            className={`${inputClass} max-w-[200px]`}
          />
        </Field>
      )}

      <Field label="Position size">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSizeMode("units")}
              className={toggleButtonClass(sizeMode === "units")}
            >
              Units
            </button>
            <button
              type="button"
              onClick={() => setSizeMode("lots")}
              className={toggleButtonClass(sizeMode === "lots")}
            >
              Lots
            </button>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={sizeValue}
            onChange={(e) => setSizeValue(e.target.value)}
            className={`${inputClass} max-w-[160px]`}
          />
          {lastPositionSizeUnits !== null && (
            <button
              type="button"
              onClick={() => {
                setSizeMode("units");
                setSizeValue(String(lastPositionSizeUnits));
              }}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
            >
              Use latest from Position Size Calculator
            </button>
          )}
        </div>
      </Field>

      <Field label="Leverage">
        <div className="flex flex-wrap gap-2">
          {LEVERAGE_OPTIONS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLeverageChoice(l)}
              className={toggleButtonClass(leverageChoice === l)}
            >
              1:{l}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLeverageChoice("custom")}
            className={toggleButtonClass(leverageChoice === "custom")}
          >
            Custom
          </button>
        </div>
        {leverageChoice === "custom" && (
          <input
            type="text"
            inputMode="decimal"
            value={customLeverage}
            onChange={(e) => setCustomLeverage(e.target.value)}
            placeholder="e.g. 150"
            className={`${inputClass} mt-2 max-w-[160px]`}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Account equity">
          <input
            type="text"
            inputMode="decimal"
            value={equity}
            onChange={(e) => setEquity(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Used margin (other open positions)" hint="Leave at 0 if none.">
          <input
            type="text"
            inputMode="decimal"
            value={usedMargin}
            onChange={(e) => setUsedMargin(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {outcome ? (
        <RiskCalcSummary
          stats={stats}
          warnings={outcome.ok ? outcome.warnings : undefined}
          errors={!outcome.ok ? outcome.errors : undefined}
        />
      ) : (
        <p className="text-xs text-zinc-500">Fill in the fields above to see required margin.</p>
      )}
    </div>
  );
}
