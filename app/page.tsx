import Link from "next/link";

const TIERS = [
  {
    name: "Basic",
    price: 9,
    tagline: "For occasional planning and review",
    highlighted: false,
    cta: "Start with Basic",
    limits: [
      "30 AI trade plans / month",
      "10 backtest runs / month",
      "Journal up to 50 trades",
      "1 year of backtest data",
      "MT4 & TradingView import",
    ],
  },
  {
    name: "Plus",
    price: 15,
    tagline: "For a regular trading routine",
    highlighted: true,
    cta: "Start with Plus",
    limits: [
      "100 AI trade plans / month",
      "50 backtest runs / month",
      "Journal up to 500 trades",
      "2 years of backtest data",
      "MT4 & TradingView import",
    ],
  },
  {
    name: "Premium",
    price: 20,
    tagline: "For unrestricted use",
    highlighted: false,
    cta: "Start with Premium",
    limits: [
      "Unlimited AI trade plans",
      "Unlimited backtest runs",
      "Unlimited journal history",
      "2 years of backtest data",
      "MT4 & TradingView import",
    ],
  },
];

const LIMIT_ROWS: { label: string; values: [string, string, string] }[] = [
  { label: "AI trade plans", values: ["30 / mo", "100 / mo", "Unlimited"] },
  { label: "Backtest runs", values: ["10 / mo", "50 / mo", "Unlimited"] },
  { label: "Journal trades", values: ["50", "500", "Unlimited"] },
  { label: "Backtest history depth", values: ["1 year", "2 years", "2 years"] },
  { label: "Live pricing & 30-day range", values: ["Included", "Included", "Included"] },
  { label: "Risk-rule & bias checks", values: ["Included", "Included", "Included"] },
  { label: "Risk calculator (all 5 tools)", values: ["Included", "Included", "Included"] },
  { label: "MT4 / TradingView import", values: ["Included", "Included", "Included"] },
  { label: "Exit-price verification", values: ["Included", "Included", "Included"] },
];

const CAPABILITIES = [
  ["5", "safety checks run on every trade plan"],
  ["5", "simple calculators for safer position sizing"],
  ["3", "ready-made strategies you can test instantly"],
  ["2 yrs", "of real price history to practice with"],
  ["2", "ways to bring in trades you've already made"],
];

const STEPS = [
  {
    n: "01",
    title: "Describe your trade idea",
    body: "Tell us what you're thinking — what to trade, which way you think it'll move, and where you'd get out if you're wrong. Just answer simple questions in plain English. No experience needed.",
  },
  {
    n: "02",
    title: "We check it for you",
    body: "We look at your plan and flag anything risky — betting too much, having no exit plan, or ignoring what the price has actually been doing lately. You'll see exactly why, in plain English.",
  },
  {
    n: "03",
    title: "See how it actually went",
    body: "Once you've made the trade, log the result. We compare it against real price history to keep things honest, so your track record shows what actually happened — not just what you remember.",
  },
];

const FAQS = [
  {
    q: "Do all plans include all four tools?",
    a: "Yes. The trade planner, risk calculator, journal, and backtest engine are available on every tier. Tiers differ only in monthly usage limits, not in feature access.",
  },
  {
    q: "Is this suitable if I have no trading experience?",
    a: "Yes. Every input field includes a plain-language explanation of the underlying concept: what a stop-loss does, why position size matters, what long and short mean. No prior terminology is assumed.",
  },
  {
    q: "Can I import my existing MT4 or TradingView history?",
    a: "Yes. Export a CSV from MT4 (Account History → Save as Report) or from TradingView's trade history, and the import will parse symbol, direction, entry/exit price, and P/L into the journal automatically.",
  },
  {
    q: "Does the system generate trade signals?",
    a: "No. It does not predict price direction or issue buy/sell signals. It takes a trade idea you supply and evaluates its risk structure: whether the stop is defined, whether sizing is appropriate, whether the reasoning shows signs of impulsive decision-making.",
  },
  {
    q: "How are backtest results kept realistic?",
    a: "Backtests run against real historical daily price data with a configurable spread/slippage cost deducted from every simulated trade, win or lose, rather than an idealized zero-cost simulation.",
  },
];

function Dot() {
  return <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />;
}

function PlannerMock() {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px]">
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
      <div className="space-y-1.5 border-t border-zinc-800 pt-3 text-[12px]">
        <p className="flex gap-2 text-zinc-400">
          <span className="text-emerald-400">[✓]</span> Defined stop loss, tied to prior swing low
        </p>
        <p className="flex gap-2 text-zinc-400">
          <span className="text-emerald-400">[✓]</span> Position size: 1.0% of account equity
        </p>
        <p className="flex gap-2 text-zinc-400">
          <span className="text-red-400">[✗]</span> Risk:reward: 1.35:1, below the 1.5:1 threshold
        </p>
      </div>
      <div className="mt-3 border border-zinc-800 px-3 py-2 text-[11px] text-zinc-400">
        FLAG: entry proposed at market, immediately following a large directional move, with no
        stated confirmation condition.
      </div>
    </div>
  );
}

function JournalMock() {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px]">
      <div className="grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800">
        {[
          ["Win rate", "58%"],
          ["Avg R", "0.8R"],
          ["Trades", "34"],
        ].map(([label, value]) => (
          <div key={label} className="bg-zinc-950 p-2.5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
            <p className="mt-0.5 text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 300 70" className="mt-3 h-16 w-full">
        <line x1="8" y1="52" x2="292" y2="52" className="stroke-zinc-800" strokeDasharray="3 3" />
        <polyline
          points="8,50 45,42 82,46 120,35 158,38 195,26 232,29 270,14 292,10"
          fill="none"
          strokeWidth="1.5"
          className="stroke-emerald-400"
        />
      </svg>
      <div className="mt-2 space-y-1.5 text-[12px]">
        <div className="flex items-center justify-between border border-zinc-800 px-3 py-2">
          <span className="text-zinc-300">
            EUR/USD · <span className="text-emerald-400">Long</span>
          </span>
          <span className="text-emerald-400">WIN · 1.8R</span>
        </div>
        <div className="flex items-center justify-between border border-zinc-800 px-3 py-2">
          <span className="text-zinc-300">
            GBP/USD · <span className="text-red-400">Short</span> · imported
          </span>
          <span className="text-red-400">LOSS · -1.0R</span>
        </div>
      </div>
    </div>
  );
}

function RiskCalculatorMock() {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px]">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Risk calculator</p>
          <p className="mt-0.5 text-base text-zinc-100">EUR/USD · 50 pip stop</p>
        </div>
        <span className="border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">1% RISK</span>
      </div>
      <div className="grid grid-cols-3 gap-3 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Risk</p>
          <p className="text-zinc-200">$100</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Size</p>
          <p className="text-zinc-200">0.20 lots</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">R:R</p>
          <p className="text-zinc-200">1 : 2.0</p>
        </div>
      </div>
      <div className="space-y-1.5 border-t border-zinc-800 pt-3 text-[12px]">
        <p className="flex gap-2 text-zinc-400">
          <span className="text-emerald-400">[✓]</span> Margin level: 340% — well clear of a call
        </p>
        <p className="flex gap-2 text-zinc-400">
          <span className="text-orange-400">[!]</span> EUR/USD + GBP/USD both net short USD — correlated exposure
        </p>
      </div>
    </div>
  );
}

function BacktestMock() {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px]">
      <p className="border border-zinc-800 px-3 py-2 text-[11px] text-zinc-400">
        &quot;10/30-day moving average crossover, risk 2%, target 6%&quot;
      </p>
      <div className="mt-3 grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800">
        {[
          ["Trades", "24"],
          ["Win rate", "46%"],
          ["Profit factor", "1.31"],
        ].map(([label, value]) => (
          <div key={label} className="bg-zinc-950 p-2.5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
            <p className="mt-0.5 text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 border border-zinc-800 text-[11px]">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-800 px-3 py-1.5 text-zinc-500">
          <span>Entry</span>
          <span>Dir</span>
          <span>Exit</span>
          <span className="text-right">R</span>
        </div>
        {[
          ["Mar 04", "Long", "stop", "-1.03R", false],
          ["Apr 18", "Long", "target", "+2.95R", true],
          ["Jun 02", "Short", "target", "+2.95R", true],
        ].map(([entry, dir, exit, r, won]) => (
          <div key={entry as string} className="grid grid-cols-4 gap-2 border-b border-zinc-900 px-3 py-1.5 last:border-0">
            <span className="text-zinc-300">{entry}</span>
            <span className={dir === "Long" ? "text-emerald-400" : "text-red-400"}>{dir}</span>
            <span className="text-zinc-500">{exit}</span>
            <span className={`text-right ${won ? "text-emerald-400" : "text-red-400"}`}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-50 [font-family:'Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-medium tracking-tight text-zinc-100">
            FxInsites
          </span>
          <nav className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
            <a href="#how" className="hover:text-zinc-200">How it works</a>
            <a href="#features" className="hover:text-zinc-200">Product</a>
            <a href="#pricing" className="hover:text-zinc-200">Pricing</a>
            <a href="#faq" className="hover:text-zinc-200">FAQ</a>
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hidden text-sm text-zinc-400 hover:text-zinc-200 sm:block">
              Sign in
            </Link>
            <Link
              href="/planner"
              className="border border-zinc-700 px-4 py-1.5 text-sm text-zinc-100 transition-colors hover:border-zinc-500"
            >
              Open the planner
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-20 pt-20 text-center">
        <h1 className="text-4xl font-medium leading-[1.15] tracking-tight text-zinc-50 sm:text-5xl">
          Trade with a <span className="text-emerald-400">plan</span>,
          <br />
          not a <span className="text-red-400">guess</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400">
          Describe your trade idea in plain English and we&apos;ll turn it into a clear plan,
          checked for the mistakes beginners make most. Test any idea against years of real price
          history before risking a cent. And every trade gets saved automatically, so you always
          know how you&apos;re really doing.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/planner"
            className="border border-zinc-100 bg-zinc-100 px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
          >
            Open the planner
          </Link>
          <a
            href="#pricing"
            className="border border-zinc-700 px-6 py-3 text-sm text-zinc-300 transition-colors hover:border-zinc-500"
          >
            View pricing
          </a>
        </div>
      </section>

      {/* Capability strip */}
      <section className="border-y border-zinc-900">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-y divide-zinc-900 sm:grid-cols-5 sm:divide-y-0">
          {CAPABILITIES.map(([stat, label]) => (
            <div key={label} className="px-6 py-8 text-center">
              <p className="text-2xl font-medium text-zinc-100">{stat}</p>
              <p className="mt-1 text-xs leading-snug text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 py-24">
        <p className="text-xs uppercase tracking-widest text-zinc-500">How it works</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
          Three simple steps, every time
        </h2>
        <div className="mt-10 grid grid-cols-1 divide-y divide-zinc-900 border-t border-zinc-900 md:grid-cols-3 md:divide-x md:divide-y-0">
          {STEPS.map((step) => (
            <div key={step.n} className="py-8 md:px-8 md:py-0 md:pt-8">
              <span className="font-mono text-xs text-zinc-600">{step.n}</span>
              <h3 className="mt-2 text-base font-medium text-zinc-100">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature deep dives */}
      <section id="features" className="mx-auto w-full max-w-6xl space-y-20 border-t border-zinc-900 px-6 py-24">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Trade planner</p>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-50">
              Your idea, turned into a safe plan
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Describe your trade in plain English — what you&apos;re trading, which way you
              expect it to move, and where you&apos;d get out. We turn that into a clear plan and
              check it for the most common mistakes: no exit plan, betting too much, or a target
              that isn&apos;t worth the risk.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><Dot />Warns you if your plan looks like a bad habit — chasing price, revenge trading, betting too big</li>
              <li className="flex gap-2"><Dot />Compares your plan to the real, current price — not guesswork</li>
              <li className="flex gap-2"><Dot />Every question explains itself, so nothing feels like jargon</li>
            </ul>
          </div>
          <PlannerMock />
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="order-last lg:order-first">
            <JournalMock />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Trade journal</p>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-50">
              Your trading history, kept honest
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Every plan you make gets saved automatically. Mark trades as open or closed, note
              how they went, and we&apos;ll quietly keep score for you — your win rate, your
              average result, and whether you&apos;re actually sticking to your own plans over
              time.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><Dot />Already trading elsewhere? Import your history from MT4 or TradingView in one click</li>
              <li className="flex gap-2"><Dot />We double-check your reported results against real price history</li>
              <li className="flex gap-2"><Dot />See not just whether you won, but whether you followed your own plan</li>
            </ul>
          </div>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Backtest engine</p>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-50">
              Try it before you risk real money
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Pick a simple strategy template, or just describe your idea in plain English — we&apos;ll
              match it to the closest template and show you exactly how. Then we run it against
              real historical prices to show how it would have actually performed.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><Dot />Realistic results — trading costs are included, not ignored</li>
              <li className="flex gap-2"><Dot />See your win rate, your biggest loss, and every trade it would have made</li>
              <li className="flex gap-2"><Dot />Or bring your own price data if you want to test something specific</li>
            </ul>
          </div>
          <BacktestMock />
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="order-last lg:order-first">
            <RiskCalculatorMock />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Risk calculator</p>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-50">
              Know exactly how much to risk
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Tell it your account balance and how much you&apos;re comfortable risking, and it
              works out the rest — how big a trade to place, what it&apos;ll cost you, and whether
              two trades are secretly the same bet in disguise. Change one number and everything
              updates together.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><Dot />Works out the right trade size automatically, in any currency</li>
              <li className="flex gap-2"><Dot />Warns you when two trades are riskier together than they look apart</li>
              <li className="flex gap-2"><Dot />Every calculation is tested against worked examples, not just guessed at</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-900 py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Pricing</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
            All four tools on every tier
          </h2>
          <p className="mt-2 max-w-lg text-sm text-zinc-500">
            The planner, risk calculator, journal, and backtest engine are included at every
            level. Tiers differ only in monthly usage limits.
          </p>

          <div className="mt-10 grid grid-cols-1 divide-y divide-zinc-900 border border-zinc-900 md:grid-cols-3 md:divide-x md:divide-y-0">
            {TIERS.map((tier) => (
              <div key={tier.name} className="flex flex-col p-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium text-zinc-100">{tier.name}</h3>
                  {tier.highlighted && (
                    <span className="border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400">
                      Most used
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500">{tier.tagline}</p>
                <p className="mt-4">
                  <span className="text-3xl font-medium text-zinc-100">${tier.price}</span>
                  <span className="text-sm text-zinc-500"> / month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2">
                  {tier.limits.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                      <Dot />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/planner"
                  className={`mt-8 border px-5 py-2.5 text-center text-sm transition-colors ${
                    tier.highlighted
                      ? "border-zinc-100 bg-zinc-100 text-black hover:bg-zinc-300"
                      : "border-zinc-700 text-zinc-200 hover:border-zinc-500"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Limits comparison table */}
          <div className="mt-8 overflow-x-auto border border-zinc-900">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-zinc-900 text-left">
                  <th className="px-5 py-3 font-medium text-zinc-500">Included</th>
                  <th className="px-5 py-3 text-center font-medium text-zinc-400">Basic</th>
                  <th className="px-5 py-3 text-center font-medium text-zinc-100">Plus</th>
                  <th className="px-5 py-3 text-center font-medium text-zinc-400">Premium</th>
                </tr>
              </thead>
              <tbody>
                {LIMIT_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-zinc-900 last:border-0">
                    <td className="px-5 py-3 text-zinc-400">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-5 py-3 text-center text-zinc-300">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-3xl border-t border-zinc-900 px-6 py-24">
        <p className="text-xs uppercase tracking-widest text-zinc-500">FAQ</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
          Questions traders ask
        </h2>
        <div className="mt-8 divide-y divide-zinc-900 border-t border-zinc-900">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-4">
              <summary className="cursor-pointer select-none list-none text-sm font-medium text-zinc-200 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block text-zinc-600 transition-transform group-open:rotate-45">
                  +
                </span>
                {faq.q}
              </summary>
              <p className="mt-3 pl-5 text-sm leading-relaxed text-zinc-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-900">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-zinc-50">
            Start with a single trade plan.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            No account required to try the planner.
          </p>
          <div className="mt-8">
            <Link
              href="/planner"
              className="inline-block border border-zinc-100 bg-zinc-100 px-7 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
            >
              Open the planner
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <span className="text-sm font-medium text-zinc-300">FxInsites</span>
          <p className="max-w-md text-center text-xs text-zinc-600 sm:text-right">
            © {new Date().getFullYear()} FxInsites. Trading involves substantial risk of loss.
            This tool assists with trade planning and record-keeping. It does not provide
            financial advice or predict market direction.
          </p>
        </div>
      </footer>
    </div>
  );
}
