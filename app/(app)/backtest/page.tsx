"use client";

import Link from "next/link";
import { useState } from "react";
import { BacktestForm } from "@/app/components/BacktestForm";
import { BacktestResults } from "@/app/components/BacktestResults";
import { runBacktest, runCustomBacktest } from "@/app/lib/backtestEngine";
import type { BacktestResult, Candle, CustomStrategy, ExitRules, StrategyParams } from "@/app/lib/backtestEngine";
import { readAndClearBacktestSeed, type BacktestSeed } from "@/app/lib/backtestSeed";
import { showToast } from "@/app/lib/toast";
import { UsagePing } from "@/app/components/UsagePing";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";
import { PlanUsageNote, USAGE_CHANGED_EVENT } from "@/app/components/PlanUsageNote";

export default function BacktestPage() {
  const userId = useCurrentUserId();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [runError, setRunError] = useState<{ message: string; limitHit: boolean } | null>(null);
  // Read once on mount (lazy initializer) — this is a one-shot handoff from the
  // planner, not something that should re-trigger on a later re-render.
  const [initialSeed] = useState<BacktestSeed | null>(() => readAndClearBacktestSeed(userId));

  async function handleRun(candles: Candle[], strategy: StrategyParams | CustomStrategy, exitRules: ExitRules) {
    setLoading(true);
    setResult(null);
    setRunError(null);

    // The simulation itself runs in the browser, so the server's only say is
    // whether this run still fits in the month's allowance.
    try {
      const res = await fetch("/api/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: "backtestRuns" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRunError({
          message: data.error ?? "Something went wrong. Please try again.",
          limitHit: data.code === "limit_reached",
        });
        if (data.code === "limit_reached") {
          showToast({ message: data.error, tone: "warning", href: "/#pricing", hrefLabel: "See plans" });
        }
        setLoading(false);
        return;
      }
    } catch {
      setRunError({ message: "Could not reach the server. Please try again.", limitHit: false });
      setLoading(false);
      return;
    }
    window.dispatchEvent(new Event(USAGE_CHANGED_EVENT));

    setTimeout(() => {
      const outcome =
        "longConditions" in strategy
          ? runCustomBacktest(candles, strategy, exitRules)
          : runBacktest(candles, strategy, exitRules);
      setResult(outcome);
      setLoading(false);
    }, 0);
  }

  return (
    <>
      <UsagePing tool="backtest" />
      <h1 className="text-3xl font-semibold tracking-tight">Backtest engine</h1>
      <p className="mt-2 text-zinc-400">
        Test a strategy against real price history before you risk real money on it. Pick a
        template or describe your idea in plain English; either way, the math underneath is
        the same deterministic simulation, so the results are trustworthy.
      </p>

      <PlanUsageNote metric="backtestRuns" noun="backtest runs" />

      <BacktestForm onRun={handleRun} loading={loading} initialSeed={initialSeed} />

      {runError && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {runError.message}
          {runError.limitHit && (
            <Link href="/#pricing" className="mt-2 block text-sky-400 hover:text-sky-300">
              See plans
            </Link>
          )}
        </div>
      )}

      {result && <BacktestResults result={result} />}
    </>
  );
}
