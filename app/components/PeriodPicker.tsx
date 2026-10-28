"use client";

import { motion, useReducedMotion } from "motion/react";
import { PERIODS, type Period } from "@/app/lib/dashboardInsights";
import { SPRING_LAYOUT } from "@/app/lib/beui/ease";

/** A row of time-range buttons with a highlight that slides to the chosen one. */
export function PeriodPicker({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  const reduce = useReducedMotion();

  return (
    <div role="tablist" aria-label="Time range" className="inline-flex flex-wrap gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          role="tab"
          aria-selected={value === p.key}
          onClick={() => onChange(p.key)}
          className="relative rounded-full px-3 py-1.5 text-xs font-medium"
        >
          {value === p.key && (
            <motion.span
              layoutId="dashboard-period-pill"
              transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
              className="absolute inset-0 rounded-full bg-zinc-100"
            />
          )}
          <span className={`relative transition-colors ${value === p.key ? "text-black" : "text-zinc-400 hover:text-zinc-200"}`}>
            {p.label}
          </span>
        </button>
      ))}
    </div>
  );
}
