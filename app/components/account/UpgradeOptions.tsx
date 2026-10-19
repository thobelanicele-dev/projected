"use client";

import { useState } from "react";
import { TIER_PRICING } from "@/app/components/PricingSection";
import { isUpgrade, limitLines, PLAN_NAMES, type PlanTier } from "@/app/lib/planLimits";
import type { Tier } from "@/app/lib/paystack";

const PAID_TIERS: Tier[] = ["basic", "premium"];

export function UpgradeOptions({ currentTier, className = "" }: { currentTier: PlanTier; className?: string }) {
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = PAID_TIERS.filter((tier) => isUpgrade(currentTier, tier));
  if (options.length === 0) return null;

  async function handleUpgrade(tier: Tier) {
    if (loadingTier) return;
    setLoadingTier(tier);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoadingTier(null);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoadingTier(null);
    }
  }

  const upgradingPaidPlan = currentTier !== "free";

  return (
    <div className={className}>
      <p className="text-zinc-200">{upgradingPaidPlan ? "Upgrade your plan" : "Upgrade for higher limits"}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((tier) => (
          <div key={tier} className="flex flex-col rounded-lg border border-zinc-800 p-4">
            <p className="text-zinc-100">{PLAN_NAMES[tier]}</p>
            <p className="mt-1 text-xs text-zinc-500">R{TIER_PRICING[tier].ZAR} / month</p>
            <ul className="mt-3 flex-1 space-y-1 text-xs text-zinc-400">
              {limitLines(tier).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleUpgrade(tier)}
              disabled={loadingTier !== null}
              className="mt-4 rounded-full bg-zinc-50 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loadingTier === tier ? "Redirecting…" : `Upgrade to ${PLAN_NAMES[tier]}`}
            </button>
          </div>
        ))}
      </div>
      {upgradingPaidPlan && (
        <p className="mt-3 text-xs text-zinc-500">
          The new plan starts as soon as you pay and your {PLAN_NAMES[currentTier]} plan stops renewing. We
          don&apos;t refund the time left on {PLAN_NAMES[currentTier]}.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
