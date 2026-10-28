"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { StatTile } from "@/app/components/StatTile";
import { WeekDayChart } from "@/app/components/WeekDayChart";
import { BestDayCard } from "@/app/components/BestDayCard";
import { UsagePing } from "@/app/components/UsagePing";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";
import { loadJournal, type JournalEntry } from "@/app/lib/journal";
import { showToast } from "@/app/lib/toast";
import {
  addWeeks,
  buildSummaryText,
  computeBestDayToTrade,
  computeWeeklySummary,
  formatR,
  formatWeekRange,
  startOfWeek,
  type WeeklyInsight,
  type WeeklySummary,
} from "@/app/lib/weeklySummary";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function headline(s: WeeklySummary): string {
  if (s.closedTrades === 0) {
    return s.plansBuilt > 0
      ? `No closed trades yet, but you built ${plural(s.plansBuilt, "plan")}.`
      : "No trades closed this week.";
  }
  const base = `${plural(s.closedTrades, "trade")} closed for ${formatR(s.totalR)}.`;
  if (!s.previous) return base;
  const diff = Math.round((s.totalR - s.previous.totalR) * 100) / 100;
  if (diff === 0) return `${base} The same as last week.`;
  return `${base} That's ${diff > 0 ? "up" : "down"} ${Math.abs(diff)}R on last week.`;
}

function InsightList({ title, insights, tone }: { title: string; insights: WeeklyInsight[]; tone: "improve" | "good" }) {
  const reduce = useReducedMotion();
  if (insights.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <ul className="mt-3 space-y-3">
        {insights.map((insight, i) => (
          <motion.li
            key={insight.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex gap-3"
          >
            <span
              aria-hidden
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone === "improve" ? "bg-orange-400" : "bg-emerald-400"}`}
            />
            <div>
              <p className="text-sm font-medium text-zinc-100">{insight.title}</p>
              <p className="mt-0.5 text-sm text-zinc-400">{insight.detail}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default function WeeklyPage() {
  const userId = useCurrentUserId();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  // Set after the page loads, so the server and the browser never disagree about which week "now" is.
  const [thisWeek, setThisWeek] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = startOfWeek(Date.now());
      setEntries(loadJournal(userId));
      setThisWeek(current);
      setWeekStart(current);
    }, 0);
    return () => clearTimeout(timeout);
  }, [userId]);

  const summary = useMemo(
    () => (entries && weekStart !== null ? computeWeeklySummary(entries, weekStart) : null),
    [entries, weekStart]
  );
  const bestDay = useMemo(() => (entries ? computeBestDayToTrade(entries) : null), [entries]);

  async function copySummary() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(buildSummaryText(summary));
      showToast({ message: "Summary copied", tone: "success" });
    } catch {
      showToast({ message: "Couldn't copy. Your browser blocked it.", tone: "error" });
    }
  }

  return (
    <>
      <UsagePing tool="weekly" />
      <h1 className="text-3xl font-semibold tracking-tight">Weekly summary</h1>
      <p className="mt-2 text-zinc-400">
        How your week in trades went, where you could do better, and which day tends to work best for
        you. It&apos;s worked out on this device from your journal, so nothing is sent anywhere.
      </p>

      {!summary || !entries || !bestDay || thisWeek === null || weekStart === null ? (
        <p className="mt-10 text-sm text-zinc-500">Loading your week…</p>
      ) : entries.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-500">
          Nothing to summarise yet. Build a plan on the{" "}
          <Link href="/planner" className="text-sky-400 hover:text-sky-300">
            planner
          </Link>{" "}
          or import past trades in your{" "}
          <Link href="/journal" className="text-sky-400 hover:text-sky-300">
            journal
          </Link>
          , then close them with a result to see your week here.
        </p>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekStart(addWeeks(weekStart, -1))}
                aria-label="Previous week"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                ←
              </button>
              <div>
                <p className="text-sm font-medium text-zinc-100">{formatWeekRange(weekStart)}</p>
                <p className="text-[11px] text-zinc-500">{weekStart === thisWeek ? "This week" : "Monday to Sunday"}</p>
              </div>
              <button
                type="button"
                onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                disabled={weekStart >= thisWeek}
                aria-label="Next week"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                →
              </button>
              {weekStart !== thisWeek && (
                <button
                  type="button"
                  onClick={() => setWeekStart(thisWeek)}
                  className="ml-1 text-xs text-sky-400 hover:text-sky-300"
                >
                  This week
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={copySummary}
              className="rounded-full border border-zinc-700 px-3.5 py-1.5 text-xs text-zinc-200 transition-colors hover:border-zinc-500"
            >
              Copy summary
            </button>
          </div>

          <p className="mt-5 text-base text-zinc-200">{headline(summary)}</p>
          {summary.closedTrades > 0 && summary.closedTrades < 3 && (
            <p className="mt-1 text-xs text-zinc-500">
              That&apos;s only {plural(summary.closedTrades, "closed trade")}, so treat what follows as hints rather than conclusions.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Trades closed"
              value={String(summary.closedTrades)}
              hint={`${plural(summary.plansBuilt, "plan")} built`}
            />
            <StatTile
              label="Win rate"
              value={summary.winRate !== null ? `${summary.winRate}%` : "N/A"}
              hint={
                summary.previous?.winRate != null
                  ? `Last week: ${summary.previous.winRate}%`
                  : "Winning trades vs losing ones"
              }
            />
            <StatTile
              label="Result"
              value={summary.closedTrades > 0 ? formatR(summary.totalR) : "N/A"}
              hint={summary.previous ? `Last week: ${formatR(summary.previous.totalR)}` : "1R is the amount you risked on a trade"}
            />
            <StatTile
              label="Profit / loss"
              value={summary.pnl !== null ? `${summary.pnl >= 0 ? "+" : ""}${summary.pnl}` : "N/A"}
              hint={
                summary.pnl !== null
                  ? `From ${plural(summary.pnlTradeCount, "trade")} with money entered`
                  : "Enter it when you close a trade in the journal"
              }
            />
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-4 text-xs uppercase tracking-wide text-zinc-500">How each day went</p>
            {summary.closedTrades > 0 ? (
              <>
                <WeekDayChart days={summary.days} bestIndex={summary.bestDay?.index ?? null} />
                <p className="mt-3 text-[11px] text-zinc-600">
                  Each bar adds up the results of the trades closed that day.
                  {summary.bestDay ? ` Your best day was ${summary.bestDay.name}.` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Nothing closed this week.{" "}
                <Link href="/journal" className="text-sky-400 hover:text-sky-300">
                  Open your journal
                </Link>{" "}
                to mark trades as closed and log how they went.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <InsightList
              title="Where you could improve"
              insights={summary.insights.filter((i) => i.tone === "improve")}
              tone="improve"
            />
            <InsightList
              title="What went well"
              insights={summary.insights.filter((i) => i.tone === "good")}
              tone="good"
            />
            {summary.closedTrades > 0 && summary.insights.length === 0 && (
              <p className="text-sm text-zinc-500">Nothing stands out this week, good or bad. Keep logging and patterns will show.</p>
            )}

            {summary.plansBuilt > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Your planning this week</p>
                <p className="mt-2 text-sm text-zinc-300">
                  You built {plural(summary.plansBuilt, "plan")}.
                  {summary.ruleAdherence.rate !== null
                    ? ` ${summary.ruleAdherence.compliant} of ${summary.ruleAdherence.plans} passed every rule check (${summary.ruleAdherence.rate}%).`
                    : ""}
                </p>
                {summary.topBiasFlags.length > 0 && (
                  <p className="mt-2 text-sm text-zinc-400">
                    Habits the planner spotted:{" "}
                    {summary.topBiasFlags.map((f) => `${f.flag} (${f.count})`).join(", ")}.
                  </p>
                )}
              </div>
            )}

            <BestDayCard result={bestDay} />
          </div>
        </>
      )}
    </>
  );
}
