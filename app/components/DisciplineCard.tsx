"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatR, type DisciplineSplit } from "@/app/lib/dashboardInsights";

const MIN_EACH = 2;

/** Do trades that cleared every rule check do better than the ones that broke a rule? The question this app exists to answer. */
export function DisciplineCard({ split }: { split: DisciplineSplit }) {
  const reduce = useReducedMotion();
  const rows = [
    { label: "Passed every check", ...split.passed },
    { label: "Broke a check", ...split.broke },
  ];
  const maxAbs = Math.max(0.5, ...rows.map((r) => Math.abs(r.avgR ?? 0)));
  const enough = split.passed.trades >= MIN_EACH && split.broke.trades >= MIN_EACH;

  let verdict: string;
  if (!enough) {
    verdict = `Not enough to compare yet. This needs at least ${MIN_EACH} closed planner trades in each group. Trades imported from a CSV have no rule checks, so they aren't counted here.`;
  } else if ((split.passed.avgR ?? 0) > (split.broke.avgR ?? 0)) {
    verdict = `Trades that passed every rule check averaged ${formatR(split.passed.avgR!)}, against ${formatR(split.broke.avgR!)} for the ones that broke a rule. Following the checks is paying off.`;
  } else {
    verdict = `Trades that broke a rule actually did as well or better here (${formatR(split.broke.avgR!)} against ${formatR(split.passed.avgR!)}). That can happen over a small number of trades, so keep watching it.`;
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Do the rule checks pay off?</p>
      <div className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-center gap-3 text-xs">
            <span className="w-32 shrink-0 text-zinc-300">{r.label}</span>
            <div className="relative h-2 flex-1 rounded-full bg-zinc-900">
              <div aria-hidden className="absolute inset-y-0 left-1/2 border-l border-zinc-700" />
              {r.avgR !== null && (
                <motion.div
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${(Math.abs(r.avgR) / maxAbs) * 50}%` }}
                  transition={{ type: "spring", duration: 0.7, bounce: 0.1, delay: i * 0.08 }}
                  className={`absolute inset-y-0 rounded-full ${r.avgR >= 0 ? "left-1/2 bg-emerald-400" : "right-1/2 bg-red-400"}`}
                />
              )}
            </div>
            <span className="w-28 shrink-0 text-right text-zinc-500">
              {r.avgR !== null ? `${formatR(r.avgR)} · ${r.trades}` : "no trades"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-zinc-400">{verdict}</p>
    </div>
  );
}
