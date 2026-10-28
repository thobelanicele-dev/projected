"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { WeeklyInsight } from "@/app/lib/weeklySummary";

/** The top tips from the weekly summary, with a link through to the full thing. */
export function NeedsAttentionCard({ insights, weekLabel }: { insights: WeeklyInsight[]; weekLabel: string }) {
  const reduce = useReducedMotion();

  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
      <p className="text-xs uppercase tracking-wide text-orange-400">Needs your attention · {weekLabel}</p>
      <ul className="mt-3 space-y-3">
        {insights.map((insight, i) => (
          <motion.li
            key={insight.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <p className="text-sm font-medium text-zinc-100">{insight.title}</p>
            <p className="mt-0.5 text-sm text-zinc-400">{insight.detail}</p>
          </motion.li>
        ))}
      </ul>
      <Link href="/weekly" className="mt-3 inline-block text-xs text-sky-400 hover:text-sky-300">
        See the full weekly summary →
      </Link>
    </div>
  );
}
