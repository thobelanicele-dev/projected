"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { PlannerDemo } from "@/app/components/PlannerDemo";
import { EASE_OUT } from "@/app/lib/beui/ease";
import { calculatePositionSize, DEFAULT_SHARED_INPUTS } from "@/app/lib/riskCalculator";

// The landing page's product section: all four tools on screen at once, each
// with a small demo of its own, so nothing sits behind a tab.

const PANEL = "border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px]";
const LABEL = "text-[10px] uppercase tracking-widest text-zinc-500";

function ToolCard({
  eyebrow,
  title,
  body,
  className = "",
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`flex flex-col gap-6 border border-zinc-900 p-6 transition-colors duration-300 hover:border-zinc-800 ${className}`}
    >
      <div>
        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          {eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-50">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{body}</p>
      </div>
      {/* Pushed to the bottom so the demo panels in a row line up. */}
      <div className="mt-auto">{children}</div>
    </article>
  );
}

// --- Risk calculator ---------------------------------------------------------

const DEMO_PAIR = "EUR/USD";
const DEMO_BALANCE = DEFAULT_SHARED_INPUTS.accountBalance;

function money(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * A working slice of the real calculator: the numbers come from the same
 * function the Risk page uses, so what a visitor sees here is what they'd get.
 */
function RiskDemo() {
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopPips, setStopPips] = useState(25);

  const outcome = calculatePositionSize({
    pair: DEMO_PAIR,
    stopLossPips: stopPips,
    exchangeRate: 1.08,
    shared: { ...DEFAULT_SHARED_INPUTS, riskValue: riskPercent },
  });
  const result = outcome.ok ? outcome.result : null;
  const tooMuch = result?.highRiskWarning ?? false;

  return (
    <div className={PANEL}>
      <p className={`border-b border-zinc-800 pb-3 ${LABEL}`}>
        {DEMO_PAIR} · {money(DEMO_BALANCE)} account
      </p>

      <label className="mt-4 block">
        <span className="flex items-baseline justify-between">
          <span className={LABEL}>Risk per trade</span>
          <span className={tooMuch ? "text-orange-400" : "text-zinc-100"}>{riskPercent.toFixed(1)}%</span>
        </span>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.5}
          value={riskPercent}
          onChange={(e) => setRiskPercent(Number(e.target.value))}
          className="mt-2 w-full cursor-pointer accent-emerald-400"
        />
      </label>

      <label className="mt-3 block">
        <span className="flex items-baseline justify-between">
          <span className={LABEL}>Stop distance</span>
          <span className="text-zinc-100">{stopPips} pips</span>
        </span>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={stopPips}
          onChange={(e) => setStopPips(Number(e.target.value))}
          className="mt-2 w-full cursor-pointer accent-emerald-400"
        />
      </label>

      <div className="mt-4 grid grid-cols-2 gap-px border border-zinc-800 bg-zinc-800" aria-live="polite">
        <div className="bg-zinc-950 p-3">
          <p className={LABEL}>Money at risk</p>
          <p className={`mt-1 text-lg ${tooMuch ? "text-orange-400" : "text-zinc-100"}`}>
            {result ? money(result.riskAmount) : "–"}
          </p>
        </div>
        <div className="bg-zinc-950 p-3">
          <p className={LABEL}>Position size</p>
          <p className="mt-1 text-lg text-zinc-100">{result ? `${result.positionLots.toFixed(2)} lots` : "–"}</p>
        </div>
      </div>

      <p className="mt-3 border border-zinc-800 px-3 py-2 text-[12px] text-zinc-400">
        Five losses in a row would cost{" "}
        <span className={tooMuch ? "text-orange-400" : "text-zinc-100"}>
          {result ? money(result.riskAmount * 5) : "–"}
        </span>
        , or {(riskPercent * 5).toFixed(1)}% of the account.
      </p>

      <p className={`mt-2 text-[10px] ${tooMuch ? "text-orange-400" : "text-zinc-600"}`}>
        {tooMuch ? "Above 3% a trade. Most traders keep it to 1 or 2%." : "Drag the sliders. Live maths, example account."}
      </p>
    </div>
  );
}

// --- Backtest engine ---------------------------------------------------------

// One made-up run, trade by trade, in R (1R = the amount risked). The stats
// under the chart are worked out from this list, so they always agree with it.
const WIN_R = 1.6;
const BACKTEST_TRADES = "LWLLWWLWLLWLWWLLWLWLLWLW".split("").map((r) => (r === "W" ? WIN_R : -1));

const CHART_W = 240;
const CHART_H = 84;

function backtestSummary() {
  const curve: number[] = [0];
  for (const r of BACKTEST_TRADES) curve.push(curve[curve.length - 1] + r);
  const wins = BACKTEST_TRADES.filter((r) => r > 0).length;
  const total = curve[curve.length - 1];

  const low = Math.min(...curve);
  const high = Math.max(...curve);
  const x = (i: number) => (i / (curve.length - 1)) * CHART_W;
  const y = (value: number) => 6 + (1 - (value - low) / (high - low)) * (CHART_H - 12);

  return {
    path: curve.map((value, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(" "),
    zeroY: y(0),
    endY: y(total),
    trades: BACKTEST_TRADES.length,
    winRate: Math.round((wins / BACKTEST_TRADES.length) * 100),
    total: `${total >= 0 ? "+" : ""}${total.toFixed(1)}R`,
  };
}

const BACKTEST = backtestSummary();

function BacktestDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const drawn = inView || reduce;

  return (
    <div ref={ref} className={PANEL}>
      <p className={`border-b border-zinc-800 pb-3 ${LABEL}`}>Breakout strategy · 1 year</p>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="mt-4 h-24 w-full overflow-visible"
        role="img"
        aria-label={`Account curve over ${BACKTEST.trades} trades, ending at ${BACKTEST.total}`}
        preserveAspectRatio="none"
      >
        <line
          x1={0}
          x2={CHART_W}
          y1={BACKTEST.zeroY}
          y2={BACKTEST.zeroY}
          className="stroke-zinc-700"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
        <motion.path
          d={BACKTEST.path}
          fill="none"
          className="stroke-emerald-400"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: drawn ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 1.8, ease: EASE_OUT }}
        />
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800">
        {[
          ["Trades", String(BACKTEST.trades)],
          ["Win rate", `${BACKTEST.winRate}%`],
          ["Result", BACKTEST.total],
        ].map(([name, value]) => (
          <div key={name} className="bg-zinc-950 p-3">
            <p className={LABEL}>{name}</p>
            <p className={`mt-1 text-lg ${name === "Result" ? "text-emerald-400" : "text-zinc-100"}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">Illustrative example, not a real backtest.</p>
    </div>
  );
}

// --- Trade journal -----------------------------------------------------------

const JOURNAL_ROWS = [
  { pair: "XAU/USD", side: "Long", result: "+1.4R", won: true, followed: true, note: "Followed the plan" },
  { pair: "EUR/USD", side: "Short", result: "-1.0R", won: false, followed: true, note: "Followed the plan" },
  { pair: "GBP/JPY", side: "Long", result: "-1.6R", won: false, followed: false, note: "Moved the stop" },
];

function JournalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const shown = inView || reduce;
  const followed = JOURNAL_ROWS.filter((row) => row.followed).length;

  return (
    <div ref={ref} className={PANEL}>
      <p className={`flex justify-between border-b border-zinc-800 pb-3 ${LABEL}`}>
        <span>Last 3 trades</span>
        <span>Plan vs result</span>
      </p>

      <ul className="divide-y divide-zinc-800">
        {JOURNAL_ROWS.map((row, i) => (
          <motion.li
            key={row.pair}
            initial={false}
            animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 8 }}
            transition={reduce ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT, delay: i * 0.18 }}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[1.2fr_auto_1.4fr]"
          >
            <span className="text-zinc-100">
              {row.pair} <span className="text-zinc-500">{row.side}</span>
            </span>
            <span className={`text-right sm:text-left ${row.won ? "text-emerald-400" : "text-red-400"}`}>
              {row.result}
            </span>
            <span
              className={`col-span-2 text-[12px] sm:col-span-1 sm:text-right ${
                row.followed ? "text-zinc-400" : "text-orange-400"
              }`}
            >
              {row.followed ? "[✓]" : "[✗]"} {row.note}
            </span>
          </motion.li>
        ))}
      </ul>

      <p className="border-t border-zinc-800 pt-3 text-[12px] text-zinc-400">
        Plan followed on {followed} of {JOURNAL_ROWS.length}. The trade that broke the plan lost the most.
      </p>
      <p className="mt-2 text-[10px] text-zinc-600">Illustrative example, not real account data.</p>
    </div>
  );
}

// --- The section -------------------------------------------------------------

export function ProductShowcase() {
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-5">
      <ToolCard
        className="lg:col-span-3"
        eyebrow="Trade planner"
        title="Your idea, turned into a safe plan"
        body="Describe your trade in plain English. We turn it into a clear plan and check it for the mistakes beginners make most."
      >
        <PlannerDemo />
      </ToolCard>

      <ToolCard
        className="lg:col-span-2"
        eyebrow="Risk calculator"
        title="Know your exact risk"
        body="Your position size, worked out from your account and how much you're willing to lose."
      >
        <RiskDemo />
      </ToolCard>

      <ToolCard
        className="lg:col-span-2"
        eyebrow="Backtest engine"
        title="Test it before you risk it"
        body="Run a strategy against real historical prices, costs included."
      >
        <BacktestDemo />
      </ToolCard>

      <ToolCard
        className="lg:col-span-3"
        eyebrow="Trade journal"
        title="Your history, kept honest"
        body="Every plan saves automatically and gets checked against what actually happened, not just what you remember."
      >
        <JournalDemo />
      </ToolCard>
    </div>
  );
}
