"use client";

import { useEffect, useState } from "react";
import { FIRST_N_COUNT } from "@/app/lib/betaRewardConfig";
import { hasSeenBetaRewardPopup, markBetaRewardPopupSeen } from "@/app/lib/betaRewardPopup";

// Shown once, the first time someone lands in the app, then never again
// (dismissal is a client-only localStorage flag, so it doesn't depend on
// server-side beta-reward eligibility the way BetaRewardBanner does).
export function BetaRewardPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasSeenBetaRewardPopup()) setVisible(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function dismiss() {
    markBetaRewardPopupSeen();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-6" onClick={dismiss}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl"
      >
        <span className="inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-emerald-400">
          Open beta
        </span>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">
          The first {FIRST_N_COUNT} people to sign up, verify their email, try a tool, and leave a
          review get a $5 Amazon gift card.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
