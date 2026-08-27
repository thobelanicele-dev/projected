"use client";

import { useEffect, useState } from "react";

export interface TourStep {
  target: string;
  title: string;
  body: string;
  /**
   * The planner is now a step-by-step wizard, so a field like "pair" or
   * "stop-loss" only exists in the DOM while the wizard is on its own step.
   * When set, the tour jumps the wizard to this step (via a custom event)
   * before it looks for the target element.
   */
  plannerStep?: number;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="nav-planner"]',
    title: "Welcome to FxInsites",
    body: "This is the trade planner — turn any idea into a checked, structured plan. Quick tour, then you're set.",
  },
  {
    target: '[data-tour="templates"]',
    title: "Not sure where to start?",
    body: "Pick an example here, then edit it to match what you're actually seeing.",
    plannerStep: 0,
  },
  {
    target: '[data-tour="pair"]',
    title: "Pick what you're trading",
    body: "Choose a common pair, or type your own.",
    plannerStep: 1,
  },
  {
    target: '[data-tour="stop-loss"]',
    title: "The most important field",
    body: "Your stop loss caps how much you can lose. Always fill this in — even just the reason, if you don't know the exact price.",
    plannerStep: 4,
  },
  {
    target: '[data-tour="submit"]',
    title: "Build your plan",
    body: "We'll check it for common mistakes and flag anything risky before you trade. The planner walks you through it step by step — this button appears on the last step.",
    plannerStep: 8,
  },
  {
    target: '[data-tour="nav-risk-calculator"]',
    title: "Risk calculator",
    body: "Work out position size, margin, and correlation before you trade.",
  },
  {
    target: '[data-tour="nav-backtest"]',
    title: "Backtest engine",
    body: "Test a strategy against real price history before risking real money.",
  },
  {
    target: '[data-tour="nav-journal"]',
    title: "Trade journal",
    body: "Every plan you build gets saved here automatically, checked against what really happened.",
  },
];

const STORAGE_KEY = "fxinsites.tourSeen";
const RESTART_EVENT = "fxinsites:replay-tour";
const TOOLTIP_WIDTH = 320;
const TOOLTIP_MARGIN = 12;

export function ProductTour({ steps }: { steps: TourStep[] }) {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) setStepIndex(0);
    }, 0);

    function handleRestart() {
      setStepIndex(0);
    }
    window.addEventListener(RESTART_EVENT, handleRestart);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener(RESTART_EVENT, handleRestart);
    };
  }, []);

  useEffect(() => {
    if (stepIndex === null) return;
    const step = steps[stepIndex];

    if (step.plannerStep !== undefined) {
      window.dispatchEvent(new CustomEvent("fxinsites:set-planner-step", { detail: step.plannerStep }));
    }

    let cleanup: (() => void) | undefined;

    // When we just told the wizard to jump to a step, give it a render cycle
    // before looking for the target — it won't be in the DOM yet otherwise.
    const lookupTimeout = setTimeout(
      () => {
        const el = document.querySelector<HTMLElement>(step.target);

        if (!el) {
          // Target not on screen right now (e.g. hidden by responsive layout) —
          // don't get stuck, just move on.
          setStepIndex((i) => (i !== null && i < steps.length - 1 ? i + 1 : null));
          return;
        }

        el.scrollIntoView({ behavior: "auto", block: "center" });
        el.classList.add("tour-highlight");

        function updateRect() {
          setRect(el!.getBoundingClientRect());
        }
        updateRect();
        const raf = requestAnimationFrame(updateRect);
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);

        cleanup = () => {
          el.classList.remove("tour-highlight");
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", updateRect);
          window.removeEventListener("scroll", updateRect, true);
        };
      },
      step.plannerStep !== undefined ? 50 : 0
    );

    return () => {
      clearTimeout(lookupTimeout);
      cleanup?.();
    };
  }, [stepIndex, steps]);

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setStepIndex(null);
    setRect(null);
  }

  function next() {
    if (stepIndex === null) return;
    if (stepIndex >= steps.length - 1) finish();
    else setStepIndex(stepIndex + 1);
  }

  function back() {
    if (stepIndex !== null && stepIndex > 0) setStepIndex(stepIndex - 1);
  }

  if (stepIndex === null || !rect) return null;

  const step = steps[stepIndex];
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeAbove = spaceBelow < 180 && rect.top > 180;
  const top = placeAbove ? Math.max(TOOLTIP_MARGIN, rect.top - TOOLTIP_MARGIN) : rect.bottom + TOOLTIP_MARGIN;
  const left = Math.min(
    Math.max(TOOLTIP_MARGIN, rect.left),
    window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN
  );

  return (
    <div
      className="fixed z-[100] rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
      style={{
        width: TOOLTIP_WIDTH,
        left,
        top: placeAbove ? undefined : top,
        bottom: placeAbove ? window.innerHeight - top : undefined,
      }}
    >
      <p className="text-xs uppercase tracking-widest text-emerald-400">
        {stepIndex + 1} / {steps.length}
      </p>
      <h3 className="mt-1.5 text-sm font-medium text-zinc-50">{step.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.body}</p>
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={finish}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-medium text-black hover:bg-zinc-300"
          >
            {stepIndex === steps.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
