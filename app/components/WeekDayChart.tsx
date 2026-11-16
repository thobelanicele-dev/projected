"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatR, type BucketUnit, type DaySummary } from "@/app/lib/weeklySummary";

// With more bars than this the chart scrolls sideways instead of squeezing them.
const BARS_THAT_FIT = 7;

/**
 * One bar per day, week, month or year: green above the line for a profitable
 * one, red below for a losing one. Started as the seven days of a week, hence
 * the name.
 */
export function WeekDayChart({
  days,
  bestIndex,
  unit = "day",
}: {
  days: DaySummary[];
  bestIndex: number | null;
  unit?: BucketUnit;
}) {
  const reduce = useReducedMotion();
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.totalR)));
  const crowded = days.length > BARS_THAT_FIT;
  const label = (d: DaySummary) => d.short ?? d.name.slice(0, 3);

  return (
    <div
      role="img"
      aria-label={`Result for each ${unit}: ${days.map((d) => `${d.name} ${d.trades === 0 ? "no trades" : formatR(d.totalR)}`).join(", ")}`}
      className={crowded ? "overflow-x-auto pb-1" : undefined}
    >
      <div style={crowded ? { minWidth: days.length * 52 } : undefined}>
        <div className="relative flex h-36 items-stretch gap-2">
          <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-zinc-800" />
          {days.map((d) => {
            const positive = d.totalR >= 0;
            const pct = (Math.abs(d.totalR) / maxAbs) * 46;
            return (
              <div
                key={d.index}
                className="relative flex-1"
                title={
                  d.trades === 0
                    ? `${d.name}: no trades`
                    : `${d.name}: ${formatR(d.totalR)} from ${d.trades} trade${d.trades === 1 ? "" : "s"}`
                }
              >
                {d.trades > 0 && (
                  <>
                    <motion.div
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: `${Math.max(pct, 2)}%` }}
                      transition={{ type: "spring", duration: 0.7, bounce: 0.15, delay: Math.min(d.index, 12) * 0.05 }}
                      className={`absolute left-1/2 w-full max-w-8 -translate-x-1/2 rounded-sm ${
                        positive ? "bottom-1/2 bg-emerald-400" : "top-1/2 bg-red-400"
                      } ${d.index === bestIndex ? "ring-2 ring-emerald-300/60" : ""}`}
                    />
                    <span
                      className={`absolute inset-x-0 text-center text-[10px] ${
                        positive ? "text-emerald-400" : "text-red-400"
                      }`}
                      style={
                        positive
                          ? { bottom: `calc(50% + ${Math.max(pct, 2)}% + 2px)` }
                          : { top: `calc(50% + ${Math.max(pct, 2)}% + 2px)` }
                      }
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
              <p
                className={`whitespace-nowrap text-[11px] ${
                  d.index === bestIndex ? "font-medium text-emerald-400" : "text-zinc-500"
                }`}
              >
                {label(d)}
              </p>
              <p className="whitespace-nowrap text-[10px] text-zinc-600">
                {d.trades > 0 ? `${d.trades} trade${d.trades === 1 ? "" : "s"}` : "-"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
