import Link from "next/link";
import { getSession } from "@/app/lib/auth/session";
import { PricingCTA } from "@/app/components/PricingCTA";
import { NavAuthLink } from "@/app/components/NavAuthLink";
import { Reveal } from "@/app/components/Reveal";
import { CountUp } from "@/app/components/CountUp";

const TIERS = [
  {
    name: "Basic",
    tier: "basic" as const,
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
    tier: "plus" as const,
    price: 20,
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
    tier: "premium" as const,
    price: 30,
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
  { value: 5, suffix: "", label: "safety checks run on every trade plan" },
  { value: 5, suffix: "", label: "simple calculators for safer position sizing" },
  { value: 3, suffix: "", label: "ready-made strategies you can test instantly" },
  { value: 2, suffix: " yrs", label: "of real price history to practice with" },
  { value: 2, suffix: "", label: "ways to bring in trades you've already made" },
];

const STEPS = [
  {
    n: "01",
    title: "Describe your trade idea",
    body: "What to trade, which way, where you'd get out. Plain English, no jargon.",
  },
  {
    n: "02",
    title: "We check it for you",
    body: "We flag anything risky — no exit plan, betting too much, ignoring the trend — and say why.",
  },
  {
    n: "03",
    title: "See how it actually went",
    body: "Log the result. We check it against real price history, so your record stays honest.",
  },
];

const GRID_FEATURES = [
  {
    eyebrow: "Trade journal",
    title: "Your history, kept honest",
    body: "Every plan saves automatically and gets checked against real price history — not just what you remember.",
    stats: [
      ["Win rate", "58%"],
      ["Avg R", "0.8R"],
      ["Trades", "34"],
    ] as [string, string][],
  },
  {
    eyebrow: "Backtest engine",
    title: "Test it before you risk it",
    body: "Pick a template or describe your own strategy — run it against real historical prices, costs included.",
    stats: [
      ["Trades", "24"],
      ["Win rate", "46%"],
      ["Profit factor", "1.31"],
    ] as [string, string][],
  },
  {
    eyebrow: "Risk calculator",
    title: "Know your exact risk",
    body: "Position size, margin, and correlated exposure — worked out automatically from your account and risk %.",
    stats: [
      ["Risk", "$100"],
      ["Size", "0.20 lots"],
      ["R:R", "1:2.0"],
    ] as [string, string][],
  },
];

const FAQS = [
  {
    q: "Do all plans include all four tools?",
    a: "Yes. Tiers differ only in monthly usage limits, not in feature access.",
  },
  {
    q: "Is this suitable if I have no trading experience?",
    a: "Yes. Every field explains itself in plain language — no prior terminology assumed.",
  },
  {
    q: "Can I import my existing MT4 or TradingView history?",
    a: "Yes. Export a CSV from either one and we'll parse it straight into your journal.",
  },
  {
    q: "Does the system generate trade signals?",
    a: "No. It checks the risk structure of an idea you supply — it doesn't predict direction.",
  },
  {
    q: "How are backtest results kept realistic?",
    a: "We run against real historical prices with spread/slippage costs deducted, not an idealized zero-cost simulation.",
  },
];

function Dot() {
  return <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
      <span className="h-1 w-1 rounded-full bg-emerald-400" />
      {children}
    </p>
  );
}

function FeatureCard({
  eyebrow,
  title,
  body,
  stats,
}: {
  eyebrow: string;
  title: string;
  body: string;
  stats: [string, string][];
}) {
  return (
    <div className="flex h-full flex-col border border-zinc-800 bg-zinc-950 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_40px_-15px_rgba(52,211,153,0.4)]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h3 className="mt-2 text-lg font-medium tracking-tight text-zinc-50">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{body}</p>
      <div className="mt-5 grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800 font-mono text-[13px]">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-zinc-950 p-2.5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
            <p className="mt-0.5 text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlannerMock() {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px] transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_40px_-15px_rgba(52,211,153,0.4)]">
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

export default async function LandingPage() {
  // A DB hiccup here must not take down the entire marketing page for every
  // visitor — fall back to the logged-out view rather than erroring.
  let isLoggedIn = false;
  try {
    isLoggedIn = (await getSession()) !== null;
  } catch (error) {
    console.error("Landing page session check failed", error);
  }

  return (
    <div className="min-h-screen bg-black text-zinc-50 [font-family:'Helvetica_Neue',Helvetica,Arial,sans-serif]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-base font-medium tracking-tight text-zinc-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
            FxInsites
          </span>
          <nav className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
            <a href="#how" className="hover:text-zinc-200">How it works</a>
            <a href="#features" className="hover:text-zinc-200">Product</a>
            <a href="#pricing" className="hover:text-zinc-200">Pricing</a>
            <a href="#faq" className="hover:text-zinc-200">FAQ</a>
          </nav>
          <div className="flex items-center gap-5">
            <NavAuthLink isLoggedIn={isLoggedIn} />
            <Link
              href={isLoggedIn ? "/planner" : "/signup"}
              className="border border-zinc-700 px-4 py-1.5 text-sm text-zinc-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-[0_0_20px_-6px_rgba(52,211,153,0.5)]"
            >
              {isLoggedIn ? "Open the planner" : "Get Started"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-20 pt-20 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob absolute left-1/2 top-[-160px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[110px]" />
          <div
            className="blob absolute right-[10%] top-[80px] h-[280px] w-[280px] rounded-full bg-emerald-400/10 blur-[90px]"
            style={{ animationDelay: "-6s" }}
          />
        </div>

        <div className="mx-auto w-full max-w-4xl">
          <Reveal>
            <h1 className="text-4xl font-medium leading-[1.15] tracking-tight text-zinc-50 sm:text-5xl">
              Trade with a plan,
              <br />
              not a guess.
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
              Describe your trade in plain English. We&apos;ll structure it, check it for
              mistakes, and track how it actually plays out.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={isLoggedIn ? "/planner" : "/signup"}
                className="border border-zinc-100 bg-zinc-100 px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-300 hover:shadow-[0_0_30px_-6px_rgba(52,211,153,0.6)]"
              >
                {isLoggedIn ? "Open the planner" : "Get Started"}
              </Link>
              <a
                href="#pricing"
                className="border border-zinc-700 px-6 py-3 text-sm text-zinc-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-500"
              >
                View pricing
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Capability strip */}
      <section className="border-y border-zinc-900">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-y divide-zinc-900 sm:grid-cols-5 sm:divide-y-0">
          {CAPABILITIES.map((cap, i) => (
            <Reveal key={cap.label} delay={i * 80} className="px-6 py-8 text-center">
              <p className="text-2xl font-medium text-zinc-100">
                <CountUp target={cap.value} suffix={cap.suffix} />
              </p>
              <p className="mt-1 text-xs leading-snug text-zinc-500">{cap.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 py-24">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
            Three simple steps, every time
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 divide-y divide-zinc-900 border-t border-zinc-900 md:grid-cols-3 md:divide-x md:divide-y-0">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 120} className="py-8 md:px-8 md:py-0 md:pt-8">
              <span className="font-mono text-xs text-emerald-500/70">{step.n}</span>
              <h3 className="mt-2 text-base font-medium text-zinc-100">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Feature spotlight + grid */}
      <section id="features" className="mx-auto w-full max-w-6xl border-t border-zinc-900 px-6 py-24">
        <Reveal className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Trade planner</Eyebrow>
            <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-50">
              Your idea, turned into a safe plan
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Describe your trade in plain English. We turn it into a clear plan and check it for
              the mistakes beginners make most.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2"><Dot />Flags bad habits — chasing price, revenge trading, oversized bets</li>
              <li className="flex gap-2"><Dot />Checked against the real, current price — not guesswork</li>
              <li className="flex gap-2"><Dot />Every question explains itself — no jargon</li>
            </ul>
          </div>
          <PlannerMock />
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {GRID_FEATURES.map((feature, i) => (
            <Reveal key={feature.eyebrow} delay={i * 100}>
              <FeatureCard {...feature} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-900 py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <Reveal>
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
              All four tools on every tier
            </h2>
            <p className="mt-2 max-w-lg text-sm text-zinc-500">
              All four tools, every tier. Limits differ, features don&apos;t. 7-day free trial
              included.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 divide-y divide-zinc-900 border border-zinc-900 md:grid-cols-3 md:divide-x md:divide-y-0">
            {TIERS.map((tier, i) => (
              <Reveal
                key={tier.name}
                delay={i * 100}
                className={`relative flex flex-col p-6 transition-all duration-300 ${
                  tier.highlighted
                    ? "bg-gradient-to-b from-emerald-500/[0.08] to-transparent"
                    : "hover:bg-zinc-950/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-medium text-zinc-100">{tier.name}</h3>
                  {tier.highlighted && (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-emerald-400 shadow-[0_0_12px_-4px_rgba(52,211,153,0.6)]">
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
                <PricingCTA
                  tier={tier.tier}
                  label={tier.cta}
                  isLoggedIn={isLoggedIn}
                  highlighted={tier.highlighted}
                />
              </Reveal>
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
        <Reveal>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
            Questions traders ask
          </h2>
        </Reveal>
        <Reveal delay={100} className="mt-8 divide-y divide-zinc-900 border-t border-zinc-900">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-4">
              <summary className="cursor-pointer select-none list-none text-sm font-medium text-zinc-200 marker:content-none transition-colors hover:text-emerald-300 [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block text-emerald-500/70 transition-transform group-open:rotate-45">
                  +
                </span>
                {faq.q}
              </summary>
              <p className="mt-3 pl-5 text-sm leading-relaxed text-zinc-500">{faq.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-zinc-900">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[110px]" />
        </div>
        <Reveal className="mx-auto w-full max-w-6xl px-6 py-20 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-zinc-50">
            Start with a single trade plan.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Try it free for 7 days — no card required.
          </p>
          <div className="mt-8">
            <Link
              href={isLoggedIn ? "/planner" : "/signup"}
              className="inline-block border border-zinc-100 bg-zinc-100 px-7 py-3 text-sm font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-300 hover:shadow-[0_0_30px_-6px_rgba(52,211,153,0.6)]"
            >
              {isLoggedIn ? "Open the planner" : "Get Started"}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-5">
            <span className="text-sm font-medium text-zinc-300">FxInsites</span>
            <nav className="flex items-center gap-4 text-xs text-zinc-500">
              <Link href="/privacy" className="hover:text-zinc-300">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-zinc-300">
                Terms
              </Link>
            </nav>
          </div>
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
