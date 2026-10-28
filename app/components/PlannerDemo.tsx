"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

const IDEA = "Buy gold if it breaks above 2,410. Stop under the last swing low, aiming for 2,450.";
const TYPE_MS = 20;
// How many reveal steps the plan goes through: 1 header and prices, 2 to 4 the
// three checks, 5 the warning flag.
const LAST_STEP = 5;
const STEP_MS = 420;

/**
 * The landing page's planner mockup, played as a short demo: an idea types
 * itself out, then the plan builds and its checks tick in one by one.
 * It replays each time it scrolls back into view. Illustrative only.
 */
export function PlannerDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers: number[] = [];

    if (reduce) {
      timers.push(
        window.setTimeout(() => {
          setTyped(IDEA.length);
          setStep(LAST_STEP);
        }, 0)
      );
      return () => timers.forEach(window.clearTimeout);
    }

    // Everything runs from timers, so each replay starts from a clean slate.
    timers.push(
      window.setTimeout(() => {
        setTyped(0);
        setStep(0);
      }, 0)
    );
    for (let i = 1; i <= IDEA.length; i++) {
      timers.push(window.setTimeout(() => setTyped(i), 300 + i * TYPE_MS));
    }
    const typedAt = 300 + IDEA.length * TYPE_MS;
    for (let s = 1; s <= LAST_STEP; s++) {
      timers.push(window.setTimeout(() => setStep(s), typedAt + 500 + (s - 1) * STEP_MS));
    }
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduce]);

  const show = (n: number) => ({
    animate: { opacity: step >= n ? 1 : 0, y: step >= n ? 0 : 8 },
    transition: reduce ? { duration: 0 } : { type: "spring" as const, duration: 0.5, bounce: 0.2 },
  });
  const typing = typed < IDEA.length;

  return (
    <div ref={ref} className="border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px]">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Your idea</p>
      <p className="mt-1 min-h-[3.4em] text-zinc-300">
        {IDEA.slice(0, typed)}
        {typing && inView && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-emerald-400" />}
      </p>

      <motion.div {...show(1)} className="mt-3 border-t border-zinc-800 pt-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Trade plan</p>
            <p className="mt-0.5 text-base text-zinc-100">XAU/USD</p>
          </div>
          <span className="border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">LONG</span>
        </div>
        <div className="grid grid-cols-3 gap-3 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Entry</p>
            <p className="text-zinc-200">2,410.00</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Stop</p>
            <p className="text-red-400">2,395.00</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Target</p>
            <p className="text-emerald-400">2,450.00</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-1.5 border-t border-zinc-800 pt-3 text-[12px]">
        {[
          { ok: true, text: "Defined stop loss, tied to prior swing low" },
          { ok: true, text: "Position size: 1.0% of account equity" },
          { ok: false, text: "Risk:reward: 1.35:1, below the 1.5:1 threshold" },
        ].map((check, i) => (
          <motion.p key={check.text} {...show(i + 2)} className="flex gap-2 text-zinc-400">
            <motion.span
              animate={{ scale: step >= i + 2 ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.5, delay: 0.1 }}
              className={check.ok ? "text-emerald-400" : "text-red-400"}
            >
              {check.ok ? "[✓]" : "[✗]"}
            </motion.span>
            {check.text}
          </motion.p>
        ))}
      </div>

      <motion.div {...show(5)} className="mt-3 border border-zinc-800 px-3 py-2 text-[11px] text-zinc-400">
        FLAG: entry proposed at market, immediately following a large directional move, with no
        stated confirmation condition.
      </motion.div>
      <p className="mt-2 text-[10px] text-zinc-600">Illustrative example, not a real trade plan.</p>
    </div>
  );
}
