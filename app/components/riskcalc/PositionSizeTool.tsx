"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { PairInput } from "@/app/components/riskcalc/PairInput";
import { RiskCalcSummary, type ResultStat } from "@/app/components/RiskCalcSummary";
import { useRiskCalcShared } from "@/app/components/riskcalc/SharedInputsContext";
import { calculatePositionSize } from "@/app/lib/riskCalculator";

export function PositionSizeTool() {
  const { shared, setLastPositionSizeUnits } = useRiskCalcShared();
  const [pair, setPair] = useState("EUR/USD");
  const [stopLossPips, setStopLossPips] = useState("50");
  const [exchangeRate, setExchangeRate] = useState("1.0850");
  const [conversionRate, setConversionRate] = useState("");

  const outcome = useMemo(() => {
    const stop = parseFloat(stopLossPips);
    const rate = parseFloat(exchangeRate);
    const conv = conversionRate.trim() ? parseFloat(conversionRate) : undefined;
    if (isNaN(stop) || isNaN(rate)) return null;
    return calculatePositionSize({
      pair,
      stopLossPips: stop,
      exchangeRate: rate,
      conversionRate: conv,
      shared,
    });
  }, [pair, stopLossPips, exchangeRate, conversionRate, shared]);

  useEffect(() => {
    if (outcome?.ok) setLastPositionSizeUnits(outcome.result.positionUnits);
  }, [outcome, setLastPositionSizeUnits]);

  const needsConversionRate = !!outcome && !outcome.ok && "conversionRate" in outcome.errors;

  const stats: ResultStat[] | undefined = outcome?.ok
    ? [
        { label: "Risk amount", value: `${shared.accountCurrency} ${outcome.result.riskAmount.toLocaleString()}` },
        { label: "Pip value", value: `${shared.accountCurrency} ${outcome.result.pipValue.toLocaleString()}` },
        { label: "Position size (lots)", value: String(outcome.result.positionLots) },
        { label: "Position size (units)", value: outcome.result.positionUnits.toLocaleString() },
      ]
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PairInput value={pair} onChange={setPair} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Stop loss (pips)">
          <input
            type="text"
            inputMode="decimal"
            value={stopLossPips}
            onChange={(e) => setStopLossPips(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Exchange rate" hint="Current rate for the pair.">
          <input
            type="text"
            inputMode="decimal"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {needsConversionRate && (
        <Field
          label={`Conversion rate (quote → ${shared.accountCurrency})`}
          hint="This pair doesn't share a leg with your account currency, so an extra conversion rate is needed."
        >
          <input
            type="text"
            inputMode="decimal"
            value={conversionRate}
            onChange={(e) => setConversionRate(e.target.value)}
            className={inputClass}
          />
        </Field>
      )}

      {outcome ? (
        <RiskCalcSummary
          stats={stats}
          warnings={outcome.ok ? outcome.warnings : undefined}
          errors={!outcome.ok ? outcome.errors : undefined}
        />
      ) : (
        <p className="text-xs text-zinc-500">Enter a stop loss and exchange rate to see position size.</p>
      )}
    </div>
  );
}
