"use client";

import { useMemo, useState } from "react";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { PairInput } from "@/app/components/riskcalc/PairInput";
import { RiskCalcSummary, type ResultStat } from "@/app/components/RiskCalcSummary";
import { useRiskCalcShared } from "@/app/components/riskcalc/SharedInputsContext";
import { calculatePipValue } from "@/app/lib/riskCalculator";

const CASE_LABEL: Record<string, string> = {
  "quote-match": "Exact — quote currency matches your account currency",
  "base-match": "Exact — base currency matches your account currency",
  cross: "This pair doesn't share a leg with your account currency",
};

export function PipValueTool() {
  const { shared } = useRiskCalcShared();
  const [pair, setPair] = useState("USD/JPY");
  const [exchangeRate, setExchangeRate] = useState("155.00");
  const [conversionRate, setConversionRate] = useState("");

  const outcome = useMemo(() => {
    const rate = parseFloat(exchangeRate);
    const conv = conversionRate.trim() ? parseFloat(conversionRate) : undefined;
    if (isNaN(rate)) return null;
    return calculatePipValue({
      pair,
      accountCurrency: shared.accountCurrency,
      lotConvention: shared.lotConvention,
      exchangeRate: rate,
      conversionRate: conv,
    });
  }, [pair, exchangeRate, conversionRate, shared.accountCurrency, shared.lotConvention]);

  const needsConversionRate = !!outcome && !outcome.ok && "conversionRate" in outcome.errors;

  const stats: ResultStat[] | undefined = outcome?.ok
    ? [
        { label: "Pip size", value: String(outcome.result.pipSize) },
        {
          label: "Pip value per lot",
          value: `${shared.accountCurrency} ${outcome.result.pipValue.toLocaleString()}`,
        },
      ]
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PairInput value={pair} onChange={setPair} />

      <Field label="Exchange rate">
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

      {outcome ? (
        <div>
          <RiskCalcSummary
            stats={stats}
            errors={!outcome.ok ? outcome.errors : undefined}
          />
          {outcome.ok && (
            <p className="mt-2 text-xs text-zinc-500">{CASE_LABEL[outcome.result.conversionCase]}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Enter an exchange rate to see pip value.</p>
      )}
    </div>
  );
}
