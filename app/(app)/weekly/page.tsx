"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { StatTile } from "@/app/components/StatTile";
import { WeekDayChart } from "@/app/components/WeekDayChart";
import { BestDayCard } from "@/app/components/BestDayCard";
import { UsagePing } from "@/app/components/UsagePing";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";
import { SPRING_LAYOUT } from "@/app/lib/beui/ease";
import { loadJournal, type JournalEntry } from "@/app/lib/journal";
import { showToast } from "@/app/lib/toast";
import {
  buildSummaryText,
  computeBestDayToTrade,
  computePeriodSummary,
  customPeriod,
  formatPeriodRange,
  formatR,
  monthPeriod,
  periodWords,
  shiftPeriod,
  weekPeriod,
  yearPeriod,
  type BucketUnit,
  type PeriodKind,
  type PeriodSummary,
  type PeriodWords,
  type SummaryPeriod,
  type WeeklyInsight,
} from "@/app/lib/weeklySummary";

const VIEWS: { kind: PeriodKind; label: string; heading: string }[] = [
  { kind: "week", label: "Week", heading: "Weekly summary" },
  { kind: "month", label: "Month", heading: "Monthly summary" },
  { kind: "year", label: "Year", heading: "Yearly summary" },
  { kind: "custom", label: "Pick dates", heading: "Summary for your dates" },
];

type SteppedKind = Exclude<PeriodKind, "custom">;

const PERIOD_OF: Record<SteppedKind, (date: number) => SummaryPeriod> = {
  week: weekPeriod,
  month: monthPeriod,
  year: yearPeriod,
};

const WHOLE_PERIOD_LABEL: Record<SteppedKind, string> = {
  week: "Monday to Sunday",
  month: "The whole month",
  year: "The whole year",
};

const CHART_TITLE: Record<BucketUnit, string> = {
  day: "How each day went",
  week: "How each week went",
  month: "How each month went",
  year: "How each year went",
};

const DAY_MS = 86_400_000;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** A date as the browser's date field wants it: "2026-11-16", in local time. */
function toDateField(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of a "2026-11-16" date field value, or null if it isn't a real date. */
function fromDateField(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? d.getTime() : null;
}

function headline(s: PeriodSummary, words: PeriodWords): string {
  if (s.closedTrades === 0) {
    return s.plansBuilt > 0
      ? `No closed trades yet, but you built ${plural(s.plansBuilt, "plan")}.`
      : `No trades closed ${words.during}.`;
  }
  const base = `${plural(s.closedTrades, "trade")} closed for ${formatR(s.totalR)}.`;
  if (!s.previous) return base;
  const diff = Math.round((s.totalR - s.previous.totalR) * 100) / 100;
  if (diff === 0) return `${base} The same as ${words.last}.`;
  return `${base} That's ${diff > 0 ? "up" : "down"} ${Math.abs(diff)}R on ${words.last}.`;
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

/** Week, Month, Year, Pick dates: a row of buttons with a highlight that slides to the chosen one. */
function ViewPicker({ value, onChange }: { value: PeriodKind; onChange: (kind: PeriodKind) => void }) {
  const reduce = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label="What the summary covers"
      className="inline-flex flex-wrap gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1"
    >
      {VIEWS.map((view) => (
        <button
          key={view.kind}
          type="button"
          role="tab"
          aria-selected={value === view.kind}
          onClick={() => onChange(view.kind)}
          className="relative rounded-full px-3 py-1.5 text-xs font-medium"
        >
          {value === view.kind && (
            <motion.span
              layoutId="summary-view-pill"
              transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
              className="absolute inset-0 rounded-full bg-zinc-100"
            />
          )}
          <span
            className={`relative transition-colors ${
              value === view.kind ? "text-black" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {view.label}
          </span>
        </button>
      ))}
    </div>
  );
}

const stepButton =
  "flex h-8 items-center justify-center rounded-full border border-zinc-800 px-3 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30";
const dateField =
  "h-8 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none transition-colors focus:border-zinc-500";

export default function WeeklyPage() {
  const userId = useCurrentUserId();
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  // Set after the page loads, so the server and the browser never disagree about what "now" is.
  const [today, setToday] = useState<number | null>(null);
  const [view, setView] = useState<PeriodKind>("week");
  // Where each of the stepped views (week, month, year) is currently looking.
  const [stepped, setStepped] = useState<Record<SteppedKind, SummaryPeriod> | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const now = Date.now();
      setEntries(loadJournal(userId));
      setToday(now);
      setStepped({ week: weekPeriod(now), month: monthPeriod(now), year: yearPeriod(now) });
      setFromDate(toDateField(now - 29 * DAY_MS));
      setToDate(toDateField(now));
    }, 0);
    return () => clearTimeout(timeout);
  }, [userId]);

  const period = useMemo<SummaryPeriod | null>(() => {
    if (!stepped) return null;
    if (view !== "custom") return stepped[view];
    const from = fromDateField(fromDate);
    const to = fromDateField(toDate);
    return from !== null && to !== null ? customPeriod(from, to) : null;
  }, [stepped, view, fromDate, toDate]);

  const summary = useMemo(
    () => (entries && period ? computePeriodSummary(entries, period) : null),
    [entries, period]
  );
  const bestDay = useMemo(() => (entries ? computeBestDayToTrade(entries) : null), [entries]);

  const words = periodWords(view);
  const heading = VIEWS.find((v) => v.kind === view)!.heading;
  const loading = !entries || !bestDay || today === null || !stepped;

  function step(kind: SteppedKind, steps: number) {
    setStepped((current) => (current ? { ...current, [kind]: shiftPeriod(current[kind], steps) } : current));
  }

  function backToNow(kind: SteppedKind) {
    if (today === null) return;
    setStepped((current) => (current ? { ...current, [kind]: PERIOD_OF[kind](today) } : current));
  }

  function lastDays(days: number) {
    if (today === null) return;
    setFromDate(toDateField(today - (days - 1) * DAY_MS));
    setToDate(toDateField(today));
  }

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
      <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-2 text-zinc-400">
        How your trading went over a week, a month, a year or any dates you pick, where you could do
        better, and which day tends to work best for you. It&apos;s worked out on this device from your
        journal, so nothing is sent anywhere.
      </p>

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading your summary…</p>
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
          , then close them with a result to see your summary here.
        </p>
      ) : (
        <>
          <div className="mt-8">
            <ViewPicker value={view} onChange={setView} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {view === "custom" ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <label className="flex items-center gap-2">
                  From
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || toDateField(today)}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={dateField}
                  />
                </label>
                <label className="flex items-center gap-2">
                  to
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    max={toDateField(today)}
                    onChange={(e) => setToDate(e.target.value)}
                    className={dateField}
                  />
                </label>
                <button type="button" onClick={() => lastDays(30)} className="ml-1 text-sky-400 hover:text-sky-300">
                  Last 30 days
                </button>
                <button type="button" onClick={() => lastDays(90)} className="text-sky-400 hover:text-sky-300">
                  Last 90 days
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => step(view, -1)}
                  aria-label={`Previous ${words.noun}`}
                  className={stepButton}
                >
                  Previous
                </button>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{formatPeriodRange(stepped[view])}</p>
                  <p className="text-[11px] text-zinc-500">
                    {stepped[view].start === PERIOD_OF[view](today).start
                      ? `This ${words.noun}`
                      : WHOLE_PERIOD_LABEL[view]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => step(view, 1)}
                  disabled={stepped[view].start >= PERIOD_OF[view](today).start}
                  aria-label={`Next ${words.noun}`}
                  className={stepButton}
                >
                  Next
                </button>
                {stepped[view].start !== PERIOD_OF[view](today).start && (
                  <button
                    type="button"
                    onClick={() => backToNow(view)}
                    className="ml-1 text-xs text-sky-400 hover:text-sky-300"
                  >
                    This {words.noun}
                  </button>
                )}
              </div>
            )}
            {summary && (
              <button
                type="button"
                onClick={copySummary}
                className="rounded-full border border-zinc-700 px-3.5 py-1.5 text-xs text-zinc-200 transition-colors hover:border-zinc-500"
              >
                Copy summary
              </button>
            )}
          </div>

          {!summary || !period ? (
            <p className="mt-8 text-sm text-zinc-500">Pick a start date and an end date to see that period.</p>
          ) : (
            <>
              {view === "custom" && (
                <p className="mt-4 text-sm font-medium text-zinc-100">
                  {formatPeriodRange(period)}
                  <span className="ml-2 text-[11px] font-normal text-zinc-500">
                    {plural(Math.max(1, Math.round((period.end - period.start) / DAY_MS)), "day")}
                  </span>
                </p>
              )}

              <p className="mt-5 text-base text-zinc-200">{headline(summary, words)}</p>
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
                      ? `${words.lastLabel}: ${summary.previous.winRate}%`
                      : "Winning trades vs losing ones"
                  }
                />
                <StatTile
                  label="Result"
                  value={summary.closedTrades > 0 ? formatR(summary.totalR) : "N/A"}
                  hint={
                    summary.previous
                      ? `${words.lastLabel}: ${formatR(summary.previous.totalR)}`
                      : "1R is the amount you risked on a trade"
                  }
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
                <p className="mb-4 text-xs uppercase tracking-wide text-zinc-500">{CHART_TITLE[summary.bucketUnit]}</p>
                {summary.closedTrades > 0 ? (
                  <>
                    <WeekDayChart days={summary.buckets} bestIndex={summary.bestBucketIndex} unit={summary.bucketUnit} />
                    <p className="mt-3 text-[11px] text-zinc-600">
                      Each bar adds up the results of the trades closed that {summary.bucketUnit}.
                      {summary.bestDay ? ` Your best day was ${summary.bestDay.name}.` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Nothing closed {words.during}.{" "}
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
                  <p className="text-sm text-zinc-500">
                    Nothing stands out {words.during}, good or bad. Keep logging and patterns will show.
                  </p>
                )}

                {summary.plansBuilt > 0 && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Your planning {words.during}</p>
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
      )}
    </>
  );
}
