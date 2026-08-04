"use client";

import { useMemo, useState } from "react";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { PairInput } from "@/app/components/riskcalc/PairInput";
import { RiskCalcSummary, type ResultStat } from "@/app/components/RiskCalcSummary";
import { calculateRiskReward } from "@/app/lib/riskCalculator";

const toggleButtonClass = (active: boolean) =>
  `flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
    active
      ? "border-zinc-500 bg-zinc-800 text-zinc-50"
      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
  }`;

export function RiskRewardTool() {
  const [inputMode, setInputMode] = useState<"prices" | "pips">("prices");
  const [pair, setPair] = useState("EUR/USD");
  const [entry, setEntry] = useState("1.1000");
  const [stopLoss, setStopLoss] = useState("1.0950");
  const [takeProfit, setTakeProfit] = useState("1.1100");
  const [riskPips, setRiskPips] = useState("50");
  const [rewardPips, setRewardPips] = useState("100");

  const outcome = useMemo(() => {
    if (inputMode === "prices") {
      const e = parseFloat(entry);
      const sl = parseFloat(stopLoss);
      const tp = parseFloat(takeProfit);
      if (isNaN(e) || isNaN(sl) || isNaN(tp)) return null;
      return calculateRiskReward({ mode: "prices", pair, entry: e, stopLoss: sl, takeProfit: tp });
    }
    const rp = parseFloat(riskPips);
    const wp = parseFloat(rewardPips);
    if (isNaN(rp) || isNaN(wp)) return null;
    return calculateRiskReward({ mode: "pips", riskPips: rp, rewardPips: wp });
  }, [inputMode, pair, entry, stopLoss, takeProfit, riskPips, rewardPips]);

  const stats: ResultStat[] | undefined = outcome?.ok
    ? [
        { label: "Risk", value: `${outcome.result.riskPips} pips` },
        { label: "Reward", value: `${outcome.result.rewardPips} pips` },
        { label: "R:R ratio", value: `1 : ${outcome.result.ratio}` },
        { label: "Breakeven win rate", value: `${outcome.result.breakevenWinRate}%` },
      ]
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <Field label="How do you want to enter this?">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setInputMode("prices")}
            className={toggleButtonClass(inputMode === "prices")}
          >
            Entry / stop / target prices
          </button>
          <button
            type="button"
            onClick={() => setInputMode("pips")}
            className={toggleButtonClass(inputMode === "pips")}
          >
            Pip counts directly
          </button>
        </div>
      </Field>

      {inputMode === "prices" ? (
        <>
          <PairInput value={pair} onChange={setPair} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Entry price">
              <input
                type="text"
                inputMode="decimal"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Stop loss price">
              <input
                type="text"
                inputMode="decimal"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Take profit price">
              <input
                type="text"
                inputMode="decimal"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Risk (pips)">
            <input
              type="text"
              inputMode="decimal"
              value={riskPips}
              onChange={(e) => setRiskPips(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Reward (pips)">
            <input
              type="text"
              inputMode="decimal"
              value={rewardPips}
              onChange={(e) => setRewardPips(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      {outcome ? (
        <RiskCalcSummary stats={stats} errors={!outcome.ok ? outcome.errors : undefined} />
      ) : (
        <p className="text-xs text-zinc-500">Fill in the fields above to see the ratio.</p>
      )}
    </div>
  );
}
