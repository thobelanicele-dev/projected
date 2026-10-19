"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UpgradeOptions } from "@/app/components/account/UpgradeOptions";
import type { PlanTier, SubscriptionState } from "@/app/lib/planLimits";

export function PlanBillingSection({
  state,
  planName,
  endsAtLabel,
  currentTier,
  billingEnabled,
}: {
  state: SubscriptionState;
  planName: string;
  /** Pre-formatted on the server so the server and browser render the same text. */
  endsAtLabel: string | null;
  /** The plan they have right now, which can still be paid while a cancelled plan runs out. */
  currentTier: PlanTier;
  billingEnabled: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (state === "none" || state === "ended") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
        <p className="text-zinc-200">You&apos;re on the Free plan.</p>
        {state === "ended" && endsAtLabel && (
          <p className="mt-1 text-xs text-zinc-500">Your {planName} plan ended on {endsAtLabel}.</p>
        )}
        {billingEnabled ? (
          <UpgradeOptions currentTier={currentTier} className="mt-4" />
        ) : (
          <Link href="/#pricing" className="mt-3 inline-block text-sky-400 hover:text-sky-300">
            See plans
          </Link>
        )}
      </div>
    );
  }

  if (state === "cancelling") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
        <p className="text-zinc-200">Your {planName} plan is cancelled.</p>
        <p className="mt-1 text-xs text-zinc-500">
          You keep it until {endsAtLabel}, and you won&apos;t be charged again. After that you&apos;ll be on the
          Free plan.
        </p>
        {billingEnabled && <UpgradeOptions currentTier={currentTier} className="mt-5 border-t border-zinc-800 pt-4" />}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
      <p className="text-zinc-200">You&apos;re on the {planName} plan.</p>
      <p className="mt-1 text-xs text-zinc-500">It renews every month until you cancel.</p>

      {billingEnabled && !confirming && (
        <UpgradeOptions currentTier={currentTier} className="mt-5 border-t border-zinc-800 pt-4" />
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 text-red-400 hover:text-red-300"
        >
          Cancel plan
        </button>
      ) : (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/10 p-4">
          <p className="text-zinc-200">Cancel your {planName} plan?</p>
          <p className="mt-1 text-xs text-zinc-500">
            You keep it until the end of the period you&apos;ve already paid for, and you won&apos;t be charged
            again. Fees already paid aren&apos;t refunded.
          </p>
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="rounded-full bg-red-500/15 px-5 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Cancelling…" : "Yes, cancel plan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={loading}
              className="text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
            >
              Keep my plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
