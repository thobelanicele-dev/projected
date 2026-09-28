"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { acknowledgeBetaBanner, hasAcknowledgedBetaBanner } from "@/app/lib/betaRewardBanner";

// Only ever rendered by (app)/layout.tsx for one of the first 5 signups who
// hasn't finished the beta reward checklist yet, so it doesn't need to
// re-check eligibility itself, just whether it's been dismissed before.
export function BetaRewardBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasAcknowledgedBetaBanner()) setVisible(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function dismiss() {
    acknowledgeBetaBanner();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-6 flex flex-col items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-300">
        You&apos;re eligible for our beta reward, a $5 Amazon gift card. Find it under your
        profile menu, top right.
      </p>
      <div className="flex shrink-0 items-center gap-4">
        <Link
          href="/beta-reward"
          onClick={dismiss}
          className="text-sm font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          View reward
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
