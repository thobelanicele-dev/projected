"use client";

import { useState } from "react";
import { BacktestForm } from "@/app/components/BacktestForm";
import { BacktestResults } from "@/app/components/BacktestResults";
import { runBacktest } from "@/app/lib/backtestEngine";
import type { BacktestResult, Candle, ExitRules, StrategyParams } from "@/app/lib/backtestEngine";

export default function BacktestPage() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);

  function handleRun(candles: Candle[], strategy: StrategyParams, exitRules: ExitRules) {
    setLoading(true);
    setResult(null);
    // Runs entirely client-side — pure math, no server round trip needed.
    setTimeout(() => {
      setResult(runBacktest(candles, strategy, exitRules));
      setLoading(false);
    }, 0);
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Backtest engine</h1>
      <p className="mt-2 text-zinc-400">
        Test a strategy against real price history before you risk real money on it. Pick a
        template or describe your idea in plain English — either way, the math underneath is
        the same deterministic simulation, so the results are trustworthy.
      </p>

      <BacktestForm onRun={handleRun} loading={loading} />

      {result && <BacktestResults result={result} />}
    </>
  );
}
