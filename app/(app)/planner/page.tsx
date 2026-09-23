"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TradeCard } from "@/app/components/TradeCard";
import { TradeIdeaForm, emptyFields, type ChartImage, type TradeIdeaFields } from "@/app/components/TradeIdeaForm";
import type { ResultStat } from "@/app/components/RiskCalcSummary";
import type { TradePlan } from "@/app/api/plan/route";
import { addPlanToJournal, loadJournal, reconstructFieldsFromEntry, type JournalEntry } from "@/app/lib/journal";
import { writeBacktestSeed } from "@/app/lib/backtestSeed";
import { UsagePing } from "@/app/components/UsagePing";

// Builds a plain-English restatement of the plan's own pattern (using the AI's
// clean reasoning fields, not the trader's possibly-rough original wording) for
// the backtester's free-text interpreter to work from.
function describePlanForBacktest(plan: TradePlan): string {
  const parts = [
    `${plan.direction === "long" ? "Go long" : "Go short"} ${plan.instrument} when ${plan.entry.condition}.`,
    plan.stopLoss.reasoning ? `Stop: ${plan.stopLoss.reasoning}` : "",
    plan.takeProfits[0]?.reasoning ? `Target: ${plan.takeProfits[0].reasoning}` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function pctFromPrices(entry: number | null, other: number | null): number | null {
  if (entry === null || other === null || entry === 0) return null;
  return Math.abs((entry - other) / entry) * 100;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TradePlan | null>(null);
  const [positionSize, setPositionSize] = useState<ResultStat[] | undefined>(undefined);
  const [chartImageUrl, setChartImageUrl] = useState<string | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setRecent(loadJournal().filter((e) => e.source === "planner").slice(0, 5)),
      0
    );
    return () => clearTimeout(timeout);
  }, []);

  async function handleSubmit(
    ideaText: string,
    fields: TradeIdeaFields,
    chartImage?: ChartImage,
    newPositionSize?: ResultStat[]
  ) {
    if (loading) return;

    setLoading(true);
    setError(null);
    setPlan(null);
    setJustSaved(false);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaText, image: chartImage ?? undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setPlan(data.plan);
      setPositionSize(newPositionSize);
      setChartImageUrl(chartImage ? `data:${chartImage.mediaType};base64,${chartImage.data}` : null);
      setJustSaved(true);
      const updated = addPlanToJournal(ideaText, data.plan, fields);
      setCurrentEntryId(updated[0]?.id ?? null);
      setRecent(updated.filter((e) => e.source === "planner").slice(0, 5));
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function loadEntryIntoPlanner(entry: JournalEntry) {
    const fields = reconstructFieldsFromEntry(entry, emptyFields);
    if (!fields) return;
    window.dispatchEvent(new CustomEvent("fxinsites:load-planner-fields", { detail: fields }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function viewSavedPlan(entry: JournalEntry) {
    if (!entry.plan) return;
    setPlan(entry.plan);
    setPositionSize(undefined);
    // Chart images are never persisted with a journal entry (avoids risking the
    // app's localStorage quota on multi-MB base64 images), so a saved plan
    // never has an overlay, even if the original submission had one.
    setChartImageUrl(null);
    setCurrentEntryId(entry.id);
    setJustSaved(false);
  }

  function startNewPlan() {
    setPlan(null);
    setPositionSize(undefined);
    setChartImageUrl(null);
    setCurrentEntryId(null);
    setJustSaved(false);
    window.dispatchEvent(new Event("fxinsites:reset-planner"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <UsagePing tool="planner" />
      <h1 className="text-3xl font-semibold tracking-tight">FxInsites</h1>
      <p className="mt-2 text-zinc-400">
        Fill in your trade idea below, field by field; no trading jargon required. The AI
        turns it into a structured plan, checks it against risk-management rules, and flags
        any behavioral bias, so you can trade with a bit more discipline even if you&apos;re
        just starting out.
      </p>

      <TradeIdeaForm onSubmit={handleSubmit} loading={loading} />

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {plan && (
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            {justSaved ? (
              <p className="text-xs text-emerald-400">✓ Saved to your journal</p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              <Link
                href="/backtest"
                onClick={() =>
                  writeBacktestSeed({
                    pair: plan.instrument,
                    description: describePlanForBacktest(plan),
                    stopLossPct: pctFromPrices(plan.entry.price, plan.stopLoss.price),
                    takeProfitPct: pctFromPrices(plan.entry.price, plan.takeProfits[0]?.price ?? null),
                  })
                }
                className="text-xs font-medium text-sky-400 underline underline-offset-2 hover:text-sky-300"
              >
                Test this pattern historically
              </Link>
              <button
                type="button"
                onClick={startNewPlan}
                className="text-xs font-medium text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
              >
                Start a new plan
              </button>
            </div>
          </div>
          <TradeCard
            plan={plan}
            positionSize={positionSize}
            chartImageUrl={chartImageUrl}
            journalEntryId={currentEntryId}
          />
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Recently saved</p>
          <ul className="mt-2 space-y-2">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 transition-colors hover:border-zinc-600"
              >
                <button
                  type="button"
                  onClick={() => viewSavedPlan(entry)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-100">
                      {entry.instrument}{" "}
                      <span className={entry.direction === "long" ? "text-emerald-400" : "text-red-400"}>
                        {entry.direction === "long" ? "Long" : "Short"}
                      </span>
                    </span>
                    <span className="text-xs text-zinc-500">{formatTimestamp(entry.createdAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{entry.plan?.summary}</p>
                </button>
                {reconstructFieldsFromEntry(entry, emptyFields) && (
                  <button
                    type="button"
                    onClick={() => loadEntryIntoPlanner(entry)}
                    className="mt-2 text-xs font-medium text-sky-400 hover:text-sky-300"
                  >
                    Use as a starting point →
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
