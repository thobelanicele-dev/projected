"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TradePlan } from "@/app/api/plan/route";
import { DisciplineCard } from "@/app/components/DisciplineCard";
import { EquityCurve } from "@/app/components/EquityCurve";
import { RuleCheckList } from "@/app/components/RuleCheckList";
import { StatTile } from "@/app/components/StatTile";
import { TradeLadder } from "@/app/components/TradeLadder";
import { calculatePositionSize, DEFAULT_SHARED_INPUTS } from "@/app/lib/riskCalculator";

// The landing page's tools section, told as a scroll story: the list of tools
// stays put on the left while each tool's screen scrolls past on the right.
// The screens are built from the same pieces the app itself uses (the plan
// diagram, the rule checks, the stat tiles, the results chart), filled with
// example data, so what a visitor sees here is what they get after signing up.

/** A window frame around a demo, so it reads as a screen from the app. */
function AppScreen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black text-left">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5 text-xs text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-zinc-300">FxInsites</span>
        <span>/ {name}</span>
        <span className="ml-auto rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
          Example
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

// --- Trade planner -----------------------------------------------------------

const DEMO_IDEA = "Buy gold if it breaks above 2,410. Stop under the last swing low, aiming for 2,450.";

const DEMO_PLAN: TradePlan = {
  instrument: "XAU/USD",
  direction: "long",
  entry: { type: "stop", price: 2410, condition: "A break above 2,410", confirmation: "" },
  stopLoss: { price: 2395, reasoning: "", invalidation: "" },
  takeProfits: [{ price: 2450, reasoning: "" }],
  riskRewardRatio: 2.67,
  ruleChecks: [
    { rule: "Defined stop loss", passed: true, note: "set under the last swing low" },
    { rule: "Position size", passed: false, note: "no risk % given, so the size is a guess" },
    { rule: "Risk to reward", passed: true, note: "2.7 to 1, above the 1.5 minimum" },
    { rule: "No averaging into losers", passed: true, note: "one entry, no adding" },
    { rule: "Clear invalidation level", passed: true, note: "below 2,395 the idea is wrong" },
  ],
  biasFlags: [
    {
      flag: "Chasing the move",
      severity: "medium",
      note: "the entry comes right after a big push up, with nothing to confirm the break is real.",
    },
  ],
  keyRisks: [],
  watchFor: [],
  summary: "",
  chartCheck: null,
};

function PlannerScreen() {
  const flag = DEMO_PLAN.biasFlags[0];
  return (
    <AppScreen name="Planner">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Your idea</p>
      <p className="mt-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">{DEMO_IDEA}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <p className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
            {DEMO_PLAN.instrument}
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">Long</span>
          </p>
          <TradeLadder plan={DEMO_PLAN} />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-200">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Safety checks</p>
          <RuleCheckList checks={DEMO_PLAN.ruleChecks} />
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-300">
        <span className="font-medium">{flag.flag}</span>
        <span className="opacity-80">: {flag.note}</span>
      </p>
    </AppScreen>
  );
}

// --- Risk calculator ---------------------------------------------------------

const DEMO_PAIR = "EUR/USD";

function money(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-100">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full cursor-pointer accent-emerald-400"
      />
    </label>
  );
}

/** A working slice of the real calculator: the numbers come from the same function the Risk page uses. */
function RiskScreen() {
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
    <AppScreen name="Risk calculator">
      <p className="text-sm text-zinc-400">
        {DEMO_PAIR} on a {money(DEFAULT_SHARED_INPUTS.accountBalance)} account. Drag the sliders.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Slider
          label="Risk per trade"
          value={riskPercent}
          display={`${riskPercent.toFixed(1)}%`}
          min={0.5}
          max={5}
          step={0.5}
          onChange={setRiskPercent}
        />
        <Slider
          label="Stop distance"
          value={stopPips}
          display={`${stopPips} pips`}
          min={10}
          max={100}
          step={5}
          onChange={setStopPips}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-live="polite">
        <StatTile label="Money at risk" value={result ? money(result.riskAmount) : "–"} />
        <StatTile label="Position size" value={result ? `${result.positionLots.toFixed(2)} lots` : "–"} />
        <div className="col-span-2 sm:col-span-1">
          <StatTile
            label="5 losses in a row"
            value={result ? money(result.riskAmount * 5) : "–"}
            hint={`${(riskPercent * 5).toFixed(1)}% of the account`}
          />
        </div>
      </div>

      <p
        className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
          tooMuch
            ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        }`}
      >
        {tooMuch
          ? "That's above 3% a trade. Most traders keep it to 1 or 2%."
          : "Within the 1 to 2% most traders stick to."}
      </p>
    </AppScreen>
  );
}

// --- Backtest engine ---------------------------------------------------------

// One made-up run, trade by trade, in R (1R = the amount risked). The stats
// beside the chart are worked out from this list, so they always agree with it.
const WIN_R = 1.6;
const BACKTEST_TRADES = "LWLLWWLWLLWLWWLLWLWLLWLW".split("").map((r) => (r === "W" ? WIN_R : -1));

function backtestSummary() {
  let running = 0;
  const points = [
    { id: "start", cumulativeR: 0 },
    ...BACKTEST_TRADES.map((r, i) => {
      running += r;
      return { id: `trade-${i}`, cumulativeR: running };
    }),
  ];
  const wins = BACKTEST_TRADES.filter((r) => r > 0);
  const losses = BACKTEST_TRADES.filter((r) => r < 0);
  const won = wins.reduce((sum, r) => sum + r, 0);
  const lost = Math.abs(losses.reduce((sum, r) => sum + r, 0));

  return {
    points,
    trades: String(BACKTEST_TRADES.length),
    winRate: `${Math.round((wins.length / BACKTEST_TRADES.length) * 100)}%`,
    profitFactor: (won / lost).toFixed(2),
    total: `+${running.toFixed(1)}R`,
  };
}

const BACKTEST = backtestSummary();

function BacktestScreen() {
  return (
    <AppScreen name="Backtest">
      <p className="text-sm text-zinc-400">Breakout strategy on EUR/USD, 1 year of real prices, costs included.</p>
      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="flex items-baseline justify-between text-xs uppercase tracking-wide text-zinc-500">
          Result over time
          <span className="text-sm font-medium normal-case text-emerald-400">{BACKTEST.total}</span>
        </p>
        <div className="mt-2">
          <EquityCurve points={BACKTEST.points} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <StatTile label="Trades" value={BACKTEST.trades} />
        <StatTile label="Win rate" value={BACKTEST.winRate} />
        <StatTile label="Profit factor" value={BACKTEST.profitFactor} />
      </div>
    </AppScreen>
  );
}

// --- Trade journal -----------------------------------------------------------

function JournalScreen() {
  return (
    <AppScreen name="Journal">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Trades" value="34" />
        <StatTile label="Win rate" value="58%" />
        <StatTile label="Average" value="+0.3R" />
      </div>
      <div className="mt-3">
        <DisciplineCard split={{ passed: { trades: 23, avgR: 0.62 }, broke: { trades: 11, avgR: -0.41 } }} />
      </div>
    </AppScreen>
  );
}

// --- The section -------------------------------------------------------------

const TOOLS = [
  {
    id: "planner",
    name: "Trade planner",
    title: "Your idea, turned into a safe plan",
    body: "Describe your trade in plain English. We turn it into a clear plan and check it for the mistakes beginners make most.",
    screen: <PlannerScreen />,
  },
  {
    id: "risk",
    name: "Risk calculator",
    title: "Know your exact risk",
    body: "Your position size, worked out from your account and how much you're willing to lose.",
    screen: <RiskScreen />,
  },
  {
    id: "backtest",
    name: "Backtest engine",
    title: "Test it before you risk it",
    body: "Pick a ready-made strategy or describe your own, then run it against real historical prices.",
    screen: <BacktestScreen />,
  },
  {
    id: "journal",
    name: "Trade journal",
    title: "Your history, kept honest",
    body: "Every plan saves automatically and gets checked against what actually happened, not just what you remember.",
    screen: <JournalScreen />,
  },
];

export function ProductShowcase() {
  const [activeId, setActiveId] = useState(TOOLS[0].id);
  const screenRefs = useRef<Record<string, HTMLElement | null>>({});

  // Whichever screen is crossing the middle of the window is the active tool.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.getAttribute("data-tool") ?? TOOLS[0].id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    for (const el of Object.values(screenRefs.current)) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function goTo(id: string) {
    screenRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      {/* The list that stays put while the screens scroll. Wide screens only. */}
      <ol className="hidden self-start lg:sticky lg:top-28 lg:block">
        {TOOLS.map((tool, i) => {
          const active = tool.id === activeId;
          return (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => goTo(tool.id)}
                aria-current={active ? "true" : undefined}
                className={`block w-full border-l-2 py-4 pl-5 text-left transition-all duration-300 ${
                  active ? "border-emerald-400 opacity-100" : "border-zinc-900 opacity-40 hover:opacity-70"
                }`}
              >
                <span className="font-mono text-xs text-emerald-500/70">0{i + 1}</span>
                <span className="ml-3 text-xs uppercase tracking-widest text-zinc-500">{tool.name}</span>
                <span className="mt-1.5 block text-lg font-medium tracking-tight text-zinc-50">{tool.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-zinc-400">{tool.body}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="space-y-16 lg:space-y-28 lg:py-10">
        {TOOLS.map((tool, i) => (
          <section
            key={tool.id}
            data-tool={tool.id}
            ref={(el) => {
              screenRefs.current[tool.id] = el;
            }}
            aria-label={tool.name}
          >
            {/* On small screens there is no side list, so each screen carries its own heading. */}
            <div className="mb-5 lg:hidden">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                <span className="font-mono text-emerald-500/70">0{i + 1}</span>
                <span className="ml-3">{tool.name}</span>
              </p>
              <h3 className="mt-1.5 text-lg font-medium tracking-tight text-zinc-50">{tool.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{tool.body}</p>
            </div>
            {tool.screen}
          </section>
        ))}
      </div>
    </div>
  );
}
