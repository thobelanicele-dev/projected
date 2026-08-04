"use client";

import { useEffect, useState } from "react";
import { suggestRMultiple } from "@/app/lib/journal";
import type { JournalEntry, TradeOutcome, TradeStatus } from "@/app/lib/journal";
import type { DayPrice } from "@/app/api/verify/route";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const statusStyles: Record<TradeStatus, string> = {
  planned: "bg-zinc-800 text-zinc-300",
  open: "bg-sky-500/15 text-sky-300",
  closed: "bg-zinc-700 text-zinc-200",
};

const outcomeStyles: Record<TradeOutcome, string> = {
  win: "bg-emerald-500/15 text-emerald-300",
  loss: "bg-red-500/15 text-red-300",
  breakeven: "bg-zinc-700 text-zinc-300",
};

export function JournalEntryCard({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: JournalEntry;
  onUpdate: (id: string, updates: Partial<JournalEntry>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<TradeStatus>(entry.status);
  const [outcome, setOutcome] = useState<TradeOutcome | undefined>(entry.outcome);
  const [actualEntryPrice, setActualEntryPrice] = useState(
    entry.actualEntryPrice?.toString() ?? ""
  );
  const [actualExitPrice, setActualExitPrice] = useState(entry.actualExitPrice?.toString() ?? "");
  const [rMultiple, setRMultiple] = useState(entry.rMultiple?.toString() ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [verification, setVerification] = useState<DayPrice | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const parsedExit = parseFloat(actualExitPrice);
    const dateStr = new Date(entry.closedAt ?? Date.now()).toISOString().slice(0, 10);

    const timeout = setTimeout(() => {
      if (status !== "closed" || isNaN(parsedExit)) {
        setVerification(null);
        setVerifyStatus("idle");
        return;
      }

      setVerifyStatus("loading");
      fetch(`/api/verify?symbol=${encodeURIComponent(entry.instrument)}&date=${dateStr}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.high === "number" && typeof data.low === "number") {
            setVerification(data);
            setVerifyStatus("ready");
          } else {
            setVerification(null);
            setVerifyStatus("error");
          }
        })
        .catch(() => {
          setVerification(null);
          setVerifyStatus("error");
        });
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualExitPrice, status]);

  function handleExitPriceChange(value: string) {
    setActualExitPrice(value);
    const parsedExit = parseFloat(value);
    if (!isNaN(parsedExit)) {
      const suggestion = suggestRMultiple({
        ...entry,
        actualEntryPrice: parseFloat(actualEntryPrice) || undefined,
        actualExitPrice: parsedExit,
      });
      if (suggestion !== null) setRMultiple(suggestion.toString());
    }
  }

  function handleSave() {
    onUpdate(entry.id, {
      status,
      outcome: status === "closed" ? outcome : undefined,
      actualEntryPrice: actualEntryPrice ? parseFloat(actualEntryPrice) : undefined,
      actualExitPrice: actualExitPrice ? parseFloat(actualExitPrice) : undefined,
      rMultiple: rMultiple ? parseFloat(rMultiple) : undefined,
      notes: notes || undefined,
      closedAt: status === "closed" ? entry.closedAt ?? Date.now() : undefined,
    });
    setExpanded(false);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-100">{entry.instrument}</span>
          <span
            className={
              entry.direction === "long" ? "text-xs text-emerald-400" : "text-xs text-red-400"
            }
          >
            {entry.direction === "long" ? "Long" : "Short"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusStyles[entry.status]}`}
          >
            {entry.status}
          </span>
          {entry.source === "imported" && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
              imported
            </span>
          )}
          {entry.outcome && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${outcomeStyles[entry.outcome]}`}
            >
              {entry.outcome}
              {typeof entry.rMultiple === "number" ? ` · ${entry.rMultiple}R` : ""}
              {typeof entry.profitAmount === "number"
                ? ` · ${entry.profitAmount >= 0 ? "+" : ""}${entry.profitAmount}`
                : ""}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-zinc-500">{formatTimestamp(entry.createdAt)}</span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-zinc-800 px-4 py-4">
          <p className="text-xs text-zinc-500">
            {entry.plan
              ? entry.plan.summary
              : "Imported from a CSV export — no AI plan or rule-check exists for this trade, just the raw record."}
          </p>

          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-300">Status</p>
            <div className="flex gap-2">
              {(["planned", "open", "closed"] as TradeStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                    status === s
                      ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {(status === "open" || status === "closed") && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Actual entry price</span>
                <input
                  type="text"
                  value={actualEntryPrice}
                  onChange={(e) => setActualEntryPrice(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-50 focus:border-zinc-600 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Actual exit price</span>
                <input
                  type="text"
                  value={actualExitPrice}
                  onChange={(e) => handleExitPriceChange(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-50 focus:border-zinc-600 focus:outline-none"
                />
                {verifyStatus === "loading" && (
                  <span className="text-xs text-zinc-500">Checking against real price data…</span>
                )}
                {verifyStatus === "error" && (
                  <span className="text-xs text-zinc-500">Couldn&apos;t verify against historical data.</span>
                )}
                {verifyStatus === "ready" &&
                  verification &&
                  (() => {
                    const exit = parseFloat(actualExitPrice);
                    const withinRange = exit >= verification.low && exit <= verification.high;
                    return (
                      <span className={`text-xs ${withinRange ? "text-emerald-400" : "text-orange-400"}`}>
                        {withinRange ? "✓ Within" : "⚠ Outside"} {verification.date}&apos;s traded
                        range ({verification.low}–{verification.high})
                      </span>
                    );
                  })()}
              </label>
            </div>
          )}

          {status === "closed" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs text-zinc-400">Outcome</p>
                <div className="flex gap-2">
                  {(["win", "loss", "breakeven"] as TradeOutcome[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOutcome(o)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs capitalize transition-colors ${
                        outcome === o
                          ? `border-transparent ${outcomeStyles[o]}`
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">R multiple achieved</span>
                <input
                  type="text"
                  value={rMultiple}
                  onChange={(e) => setRMultiple(e.target.value)}
                  placeholder="e.g. 1.5 or -1"
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-50 focus:border-zinc-600 focus:outline-none"
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400">Notes — what did you learn?</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Did you follow your own plan? What would you do differently?"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
          </label>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Delete entry
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-zinc-50 px-4 py-1.5 text-xs font-medium text-black transition-colors hover:bg-zinc-300"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
