"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { StatTile } from "@/app/components/StatTile";
import { ErrorTrendChart } from "@/app/components/ErrorTrendChart";
import { AccuracyTable } from "@/app/components/AccuracyTable";
import { PeriodPicker } from "@/app/components/PeriodPicker";
import { EquityChart } from "@/app/components/EquityChart";
import { BreakdownBars } from "@/app/components/BreakdownBars";
import { DisciplineCard } from "@/app/components/DisciplineCard";
import { NeedsAttentionCard } from "@/app/components/NeedsAttentionCard";
import { loadJournal, computeStats, type JournalEntry } from "@/app/lib/journal";
import { computeAccuracyStats } from "@/app/lib/dashboardStats";
import {
  breakdownByDirection,
  breakdownByInstrument,
  computeConsistency,
  computeDisciplineSplit,
  computeEquityCurve,
  filterByPeriod,
  formatR,
  periodHeadline,
  type Period,
} from "@/app/lib/dashboardInsights";
import { addWeeks, computeWeeklySummary, formatWeekRange, startOfWeek } from "@/app/lib/weeklySummary";
import { UsagePing } from "@/app/components/UsagePing";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";

const PERIOD_KEY = "fxinsites.dashboardPeriod";
const VALID_PERIODS: Period[] = ["7d", "30d", "90d", "all"];

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mt-10">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{children}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const userId = useCurrentUserId();
  const reduce = useReducedMotion();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  // Set after the page loads, so the server and the browser never disagree about what "now" is.
  const [now, setNow] = useState<number | null>(null);
  const [period, setPeriodState] = useState<Period>("30d");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setEntries(loadJournal(userId));
      setNow(Date.now());
      try {
        const saved = window.localStorage.getItem(PERIOD_KEY) as Period | null;
        if (saved && VALID_PERIODS.includes(saved)) setPeriodState(saved);
      } catch {
        // Storage can be blocked; the default range is fine.
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [userId]);

  function setPeriod(next: Period) {
    setPeriodState(next);
    try {
      window.localStorage.setItem(PERIOD_KEY, next);
    } catch {
      // ignore
    }
  }

  const view = useMemo(() => {
    if (!entries || now === null) return null;
    const filtered = filterByPeriod(entries, period, now);

    // Tips come from the weekly summary: this week, or last week if this one has nothing closed yet.
    const thisWeek = startOfWeek(now);
    let attentionWeek = thisWeek;
    let weekly = computeWeeklySummary(entries, attentionWeek);
    if (weekly.closedTrades === 0) {
      attentionWeek = addWeeks(thisWeek, -1);
      weekly = computeWeeklySummary(entries, attentionWeek);
    }

    return {
      filtered,
      stats: computeStats(filtered),
      accuracy: computeAccuracyStats(filtered),
      curve: computeEquityCurve(filtered),
      consistency: computeConsistency(filtered),
      byPair: breakdownByInstrument(filtered),
      byDirection: breakdownByDirection(filtered),
      discipline: computeDisciplineSplit(filtered),
      headline: periodHeadline(filtered, period),
      attention: weekly.insights.filter((i) => i.tone === "improve").slice(0, 2),
      attentionLabel: attentionWeek === thisWeek ? "this week" : "last week",
      attentionRange: formatWeekRange(attentionWeek),
    };
  }, [entries, now, period]);

  const c = view?.consistency;

  return (
    <>
      <UsagePing tool="dashboard" />
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-zinc-400">
        How your trading is going, what&apos;s working, and what to fix, built from the trades you&apos;ve
        logged. Results are shown in R: 1R is the amount you risked on a trade, so +2R means you made twice
        what you risked.
      </p>

      {!view || !entries ? (
        <p className="mt-10 text-sm text-zinc-500">Loading your dashboard…</p>
      ) : entries.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">
          Nothing here yet. Build a plan on the{" "}
          <Link href="/planner" className="text-sky-400 hover:text-sky-300">
            planner
          </Link>{" "}
          or import past trades in your{" "}
          <Link href="/journal" className="text-sky-400 hover:text-sky-300">
            journal
          </Link>
          , then close them with a result.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <PeriodPicker value={period} onChange={setPeriod} />
            <Link href="/weekly" className="text-xs text-sky-400 hover:text-sky-300">
              Weekly summary →
            </Link>
          </div>

          <motion.p
            key={view.headline}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 text-lg text-zinc-100"
          >
            {view.headline}
          </motion.p>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Your progress</p>
            <EquityChart curve={view.curve} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Trades closed" value={String(view.stats.closedTrades)} />
            <StatTile
              label="Win rate"
              value={view.stats.winRate !== null ? `${view.stats.winRate}%` : "N/A"}
              hint="Winning trades vs losing ones"
            />
            <StatTile
              label="Average per trade"
              value={view.stats.avgR !== null ? formatR(view.stats.avgR) : "N/A"}
              hint="Above zero means you make money on average"
            />
            <StatTile
              label="Profit / loss"
              value={
                view.stats.totalProfitAmount !== null
                  ? `${view.stats.totalProfitAmount >= 0 ? "+" : ""}${view.stats.totalProfitAmount}`
                  : "N/A"
              }
              hint={view.stats.totalProfitAmount === null ? "Enter it when you close a trade" : "From trades with money entered"}
            />
          </div>

          {view.attention.length > 0 && (
            <div className="mt-4">
              <NeedsAttentionCard insights={view.attention} weekLabel={`${view.attentionLabel}, ${view.attentionRange}`} />
            </div>
          )}

          <SectionTitle hint="How steady your results are, not just how big.">Consistency</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="Average win"
              value={c!.avgWinR !== null ? formatR(c!.avgWinR) : "N/A"}
              hint="What a typical winning trade makes"
            />
            <StatTile
              label="Average loss"
              value={c!.avgLossR !== null ? formatR(c!.avgLossR) : "N/A"}
              hint="What a typical losing trade costs"
            />
            <StatTile
              label="Profit factor"
              value={c!.profitFactor !== null ? String(c!.profitFactor) : "N/A"}
              hint="Total won divided by total lost. Above 1 means you won more than you lost"
            />
            <StatTile
              label="Longest losing run"
              value={c!.longestLossStreak > 0 ? plural(c!.longestLossStreak, "trade") : "None"}
              hint="Most losses in a row"
            />
            <StatTile
              label="Longest winning run"
              value={c!.longestWinStreak > 0 ? plural(c!.longestWinStreak, "trade") : "None"}
              hint="Most wins in a row"
            />
            <StatTile
              label="Right now"
              value={c!.current ? `${c!.current.length} ${c!.current.type === "win" ? "win" : "loss"}${c!.current.length === 1 ? "" : c!.current.type === "win" ? "s" : "es"}` : "N/A"}
              hint="Your current run"
            />
          </div>

          <SectionTitle hint="Where your results are coming from, and where they're leaking.">What&apos;s working</SectionTitle>
          <div className="mt-3 flex flex-col gap-4">
            <DisciplineCard split={view.discipline} />
            <BreakdownBars title="By pair" rows={view.byPair} />
            <BreakdownBars title="Long vs short" rows={view.byDirection} />
          </div>

          <SectionTitle hint="Counts only trades you built with the AI planner, closed, and logged a real result for. Imported trades have no AI plan, so they're left out of this part.">
            Did the AI&apos;s plan match what really happened?
          </SectionTitle>
          {view.accuracy.comparableCount === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Nothing to compare yet in this time range.{" "}
              <Link href="/planner" className="text-sky-400 hover:text-sky-300">
                Build a plan
              </Link>
              , take the trade, then close it in your journal with the real result.
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile label="Trades we can check" value={String(view.accuracy.comparableCount)} />
                <StatTile
                  label="Matched or beat the plan"
                  value={view.accuracy.metOrBeatPlanRate !== null ? `${view.accuracy.metOrBeatPlanRate}%` : "N/A"}
                  hint="How often a trade did as well as, or better than, what the plan expected"
                />
                <StatTile
                  label="Gap to the plan"
                  value={view.accuracy.avgErrorR !== null ? formatR(view.accuracy.avgErrorR) : "N/A"}
                  hint="On average, how far the real result was from what the plan expected. Below zero means trades usually fell short"
                />
                <StatTile
                  label="Entry price accuracy"
                  value={view.accuracy.avgEntryDeviationPct !== null ? `${view.accuracy.avgEntryDeviationPct}%` : "N/A"}
                  hint="How far off your real entry usually was from the planned one"
                />
              </div>

              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">How close each trade came to the plan</p>
                <ErrorTrendChart comparisons={view.accuracy.comparisons} />
                <p className="mt-2 text-[11px] text-zinc-600">
                  Each bar is one trade, oldest to newest. Green bars above the line beat the plan; red bars below it fell short.
                </p>
              </div>

              <div className="mt-4">
                <AccuracyTable comparisons={view.accuracy.comparisons} />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
