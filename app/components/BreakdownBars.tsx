"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatR, MIN_SAMPLE, type GroupRow } from "@/app/lib/dashboardInsights";

/** Average result per group (a pair, long vs short), as bars either side of zero. Faded when a group has too few trades. */
export function BreakdownBars({ title, hint, rows, max = 6 }: { title: string; hint?: string; rows: GroupRow[]; max?: number }) {
  const reduce = useReducedMotion();
  const shown = rows.slice(0, max);
  const maxAbs = Math.max(0.5, ...shown.map((r) => Math.abs(r.avgR)));

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Nothing to show yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {shown.map((r, i) => (
            <div key={r.key} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 truncate text-zinc-300">{r.key}</span>
              <div className="relative h-2 flex-1 rounded-full bg-zinc-900">
                <div aria-hidden className="absolute inset-y-0 left-1/2 border-l border-zinc-700" />
                <motion.div
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${(Math.abs(r.avgR) / maxAbs) * 50}%` }}
                  transition={{ type: "spring", duration: 0.7, bounce: 0.1, delay: i * 0.05 }}
                  className={`absolute inset-y-0 rounded-full ${r.avgR >= 0 ? "left-1/2 bg-emerald-400" : "right-1/2 bg-red-400"} ${
                    r.trades < MIN_SAMPLE ? "opacity-40" : ""
                  }`}
                />
              </div>
              <span className="w-32 shrink-0 text-right text-zinc-500">
                {formatR(r.avgR)} · {r.trades} trade{r.trades === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-zinc-600">
        Average result per trade. Faded bars have fewer than {MIN_SAMPLE} trades behind them, so don&apos;t read much into those.
      </p>
    </div>
  );
}
