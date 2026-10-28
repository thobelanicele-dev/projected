"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { PLAN_NAMES, type PlanTier, type UsageMetric } from "@/app/lib/planLimits";

/** Fire this after an action that spends allowance so the note refreshes. */
export const USAGE_CHANGED_EVENT = "fxinsites:usage-changed";

interface Summary {
  tier: PlanTier;
  limits: Record<UsageMetric, number | null>;
  usage: Record<UsageMetric, number>;
}

/** A thin bar showing how much of the month's allowance is used. Turns orange near the limit. */
export function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const reduce = useReducedMotion();
  const fraction = Math.min(1, used / limit);
  const nearLimit = fraction >= 0.8;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(used, limit)}
      className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-zinc-800"
    >
      <motion.div
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${fraction * 100}%` }}
        transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.8, bounce: 0.15 }}
        className={`h-full rounded-full ${nearLimit ? "bg-orange-400" : "bg-emerald-400"}`}
      />
    </div>
  );
}

export function PlanUsageNote({ metric, noun }: { metric: UsageMetric; noun: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/limits")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) setSummary(data);
        })
        .catch(() => {});
    }
    load();
    window.addEventListener(USAGE_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(USAGE_CHANGED_EVENT, load);
    };
  }, []);

  if (!summary) return null;

  const limit = summary.limits[metric];
  const used = summary.usage[metric];
  const atLimit = limit !== null && used >= limit;

  return (
    <div>
      <p className={`mt-2 text-xs ${atLimit ? "text-orange-400" : "text-zinc-500"}`}>
        {limit === null ? `${used} ${noun} this month` : `${used} of ${limit} ${noun} used this month`}
        {" · "}
        {PLAN_NAMES[summary.tier]} plan
        {summary.tier !== "premium" && (
          <>
            {" · "}
            <Link href="/#pricing" className="text-sky-400 hover:text-sky-300">
              See plans
            </Link>
          </>
        )}
      </p>
      {limit !== null && <UsageMeter used={used} limit={limit} />}
    </div>
  );
}
