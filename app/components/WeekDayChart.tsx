"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatR, type DaySummary } from "@/app/lib/weeklySummary";

/** Seven bars, Monday to Sunday: green above the line for a profitable day, red below for a losing one. */
export function WeekDayChart({ days, bestIndex }: { days: DaySummary[]; bestIndex: number | null }) {
  const reduce = useReducedMotion();
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.totalR)));

  return (
    <div
      role="img"
      aria-label={`Result for each day of the week: ${days.map((d) => `${d.name} ${d.trades === 0 ? "no trades" : formatR(d.totalR)}`).join(", ")}`}
    >
      <div className="relative flex h-36 items-stretch gap-2">
        <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-zinc-800" />
        {days.map((d) => {
          const positive = d.totalR >= 0;
          const pct = (Math.abs(d.totalR) / maxAbs) * 46;
          return (
            <div key={d.index} className="relative flex-1" title={d.trades === 0 ? `${d.name}: no trades` : `${d.name}: ${formatR(d.totalR)} from ${d.trades} trade${d.trades === 1 ? "" : "s"}`}>
              {d.trades > 0 && (
                <>
                  <motion.div
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: `${Math.max(pct, 2)}%` }}
                    transition={{ type: "spring", duration: 0.7, bounce: 0.15, delay: d.index * 0.05 }}
                    className={`absolute left-1/2 w-full max-w-8 -translate-x-1/2 rounded-sm ${
                      positive ? "bottom-1/2 bg-emerald-400" : "top-1/2 bg-red-400"
                    } ${d.index === bestIndex ? "ring-2 ring-emerald-300/60" : ""}`}
                  />
                  <span
                    className={`absolute inset-x-0 text-center text-[10px] ${
                      positive ? "text-emerald-400" : "text-red-400"
                    }`}
                    style={positive ? { bottom: `calc(50% + ${Math.max(pct, 2)}% + 2px)` } : { top: `calc(50% + ${Math.max(pct, 2)}% + 2px)` }}
                  >
                    {formatR(d.totalR)}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {days.map((d) => (
          <div key={d.index} className="flex-1 text-center">
            <p className={`text-[11px] ${d.index === bestIndex ? "font-medium text-emerald-400" : "text-zinc-500"}`}>
              {d.name.slice(0, 3)}
            </p>
            <p className="text-[10px] text-zinc-600">{d.trades > 0 ? `${d.trades} trade${d.trades === 1 ? "" : "s"}` : "-"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
