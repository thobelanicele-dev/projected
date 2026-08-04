"use client";

import { useEffect, useState } from "react";
import { TradeCard } from "@/app/components/TradeCard";
import { TradeIdeaForm } from "@/app/components/TradeIdeaForm";
import type { TradePlan } from "@/app/api/plan/route";
import { addPlanToJournal, loadJournal, type JournalEntry } from "@/app/lib/journal";

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
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setRecent(loadJournal().filter((e) => e.source === "planner").slice(0, 5)),
      0
    );
    return () => clearTimeout(timeout);
  }, []);

  async function handleSubmit(ideaText: string) {
    if (loading) return;

    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setPlan(data.plan);
      setRecent(
        addPlanToJournal(ideaText, data.plan)
          .filter((e) => e.source === "planner")
          .slice(0, 5)
      );
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">FxInsites</h1>
      <p className="mt-2 text-zinc-400">
        Fill in your trade idea below, field by field — no trading jargon required. The AI
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
          <TradeCard plan={plan} />
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Recently saved</p>
          <ul className="mt-2 space-y-2">
            {recent.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => entry.plan && setPlan(entry.plan)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-left transition-colors hover:border-zinc-600"
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
