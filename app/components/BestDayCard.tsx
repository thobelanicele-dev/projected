"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatR, type BestDayToTrade } from "@/app/lib/weeklySummary";

/** Which weekday has gone best for this trader across every closed trade, with the honest caveat attached. */
export function BestDayCard({ result }: { result: BestDayToTrade }) {
  const reduce = useReducedMotion();
  const maxAbs = Math.max(0.5, ...result.byDay.map((d) => Math.abs(d.avgR)));

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Your best day to trade</p>

      {result.ready && result.best ? (
        <>
          <p className="mt-2 text-lg font-medium text-zinc-50">{result.best.name}</p>
          <p className="mt-1 text-sm text-zinc-400">
            Trades you closed on {result.best.name}s have averaged {formatR(result.best.avgR)}
            {result.best.winRate !== null ? ` with a ${result.best.winRate}% win rate` : ""}, across{" "}
            {result.best.trades} trades.
            {result.worst && result.worst.index !== result.best.index
              ? ` ${result.worst.name}s have been your hardest at ${formatR(result.worst.avgR)} on average.`
              : ""}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-400">
            {result.ready
              ? "No single day has enough trades behind it yet. A day needs at least 3 closed trades before it can be called your best."
              : `Not enough trades yet. This needs at least ${result.tradesNeeded} closed trades with a result logged, so one lucky day can't fool you. You have ${result.tradesCounted}.`}
          </p>
          {!result.ready && (
            <div className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${Math.min(100, (result.tradesCounted / result.tradesNeeded) * 100)}%` }}
                transition={{ type: "spring", duration: 0.8, bounce: 0.1 }}
                className="h-full rounded-full bg-emerald-400"
              />
            </div>
          )}
        </>
      )}

      {result.tradesCounted > 0 && (
        <div className="mt-4 space-y-1.5">
          {result.byDay.map((d) => (
            <div key={d.index} className="flex items-center gap-3 text-xs">
              <span className="w-8 shrink-0 text-zinc-500">{d.name.slice(0, 3)}</span>
              <div className="relative h-2 flex-1 rounded-full bg-zinc-900">
                <div aria-hidden className="absolute inset-y-0 left-1/2 border-l border-zinc-700" />
                {d.trades > 0 && (
                  <motion.div
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${(Math.abs(d.avgR) / maxAbs) * 50}%` }}
                    transition={{ type: "spring", duration: 0.7, bounce: 0.1, delay: d.index * 0.04 }}
                    className={`absolute inset-y-0 rounded-full ${d.avgR >= 0 ? "left-1/2 bg-emerald-400" : "right-1/2 bg-red-400"} ${d.trades < 3 ? "opacity-40" : ""}`}
                  />
                )}
              </div>
              <span className="w-28 shrink-0 text-right text-zinc-500">
                {d.trades > 0 ? `${formatR(d.avgR)} · ${d.trades} trade${d.trades === 1 ? "" : "s"}` : "no trades"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-zinc-600">
        Based on trades marked closed with a result logged, grouped by the day you closed them. Faded bars have fewer than 3
        trades behind them, so don&apos;t read much into those. A small number of trades can mislead, so treat it as a hint.
      </p>
    </div>
  );
}
