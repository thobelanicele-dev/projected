"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PLAN_NAMES, type PlanTier, type UsageMetric } from "@/app/lib/planLimits";

/** Fire this after an action that spends allowance so the note refreshes. */
export const USAGE_CHANGED_EVENT = "fxinsites:usage-changed";

interface Summary {
  tier: PlanTier;
  limits: Record<UsageMetric, number | null>;
  usage: Record<UsageMetric, number>;
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
  );
}
