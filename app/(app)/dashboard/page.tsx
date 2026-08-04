"use client";

import { useEffect, useState } from "react";
import { StatTile } from "@/app/components/StatTile";
import { EquityCurve } from "@/app/components/EquityCurve";
import { ErrorTrendChart } from "@/app/components/ErrorTrendChart";
import { AccuracyTable } from "@/app/components/AccuracyTable";
import { loadJournal, computeStats, type JournalEntry } from "@/app/lib/journal";
import { computeAccuracyStats } from "@/app/lib/dashboardStats";

export default function DashboardPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => setEntries(loadJournal()), 0);
    return () => clearTimeout(timeout);
  }, []);

  const stats = computeStats(entries);
  const accuracy = computeAccuracyStats(entries);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-zinc-400">
        A simple look at how your trades went, and whether the AI&apos;s plans were actually
        right — built from the trades you&apos;ve logged.
      </p>

      <p className="mt-8 text-xs uppercase tracking-wide text-zinc-500">Your trading so far</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Trades recorded" value={String(stats.totalTrades)} />
        <StatTile
          label="Win rate"
          value={stats.winRate !== null ? `${stats.winRate}%` : "—"}
          hint="% of trades that ended in profit"
        />
        <StatTile
          label="Average result"
          value={stats.avgR !== null ? `${stats.avgR >= 0 ? "+" : ""}${stats.avgR}× risk` : "—"}
          hint="How big your wins/losses were vs. what you risked"
        />
        <StatTile
          label="Total profit / loss"
          value={
            stats.totalProfitAmount !== null
              ? `${stats.totalProfitAmount >= 0 ? "+" : ""}${stats.totalProfitAmount}`
              : "—"
          }
        />
      </div>

      <p className="mt-8 text-xs uppercase tracking-wide text-zinc-500">
        Did the AI&apos;s plan match what really happened?
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        This only counts trades you built with the AI planner, marked closed, and told us the
        real result for. Trades imported from MT4/TradingView don&apos;t have an AI plan
        attached, so they&apos;re left out of this part.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Trades we can check" value={String(accuracy.comparableCount)} />
        <StatTile
          label="Matched or beat the plan"
          value={accuracy.metOrBeatPlanRate !== null ? `${accuracy.metOrBeatPlanRate}%` : "—"}
          hint="How often the trade did as well as, or better than, what the plan expected"
        />
        <StatTile
          label="Average miss"
          value={
            accuracy.avgErrorR !== null
              ? `${accuracy.avgErrorR >= 0 ? "+" : ""}${accuracy.avgErrorR}×`
              : "—"
          }
          hint="On average, how far the real result was from what the plan expected (below zero means it usually fell short)"
        />
        <StatTile
          label="Entry price accuracy"
          value={accuracy.avgEntryDeviationPct !== null ? `${accuracy.avgEntryDeviationPct}%` : "—"}
          hint="How far off your actual entry price usually was from the planned one"
        />
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
          How close each trade came to the plan
        </p>
        <ErrorTrendChart comparisons={accuracy.comparisons} />
        <p className="mt-2 text-[11px] text-zinc-600">
          Each bar is one trade, oldest to newest. Green bars above the line beat the plan; red
          bars below it fell short.
        </p>
      </div>

      <div className="mt-4">
        <AccuracyTable comparisons={accuracy.comparisons} />
      </div>

      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
          Your progress over time
        </p>
        <EquityCurve points={stats.equityCurve} />
        <p className="mt-2 text-[11px] text-zinc-600">
          Each step is one closed trade&apos;s result, added to the one before it — so you can
          see whether you&apos;re trending up or down overall.
        </p>
      </div>
    </>
  );
}
