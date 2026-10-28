import Link from "next/link";
import { headers } from "next/headers";
import { getSession } from "@/app/lib/auth/session";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { NavAuthLink } from "@/app/components/NavAuthLink";
import { Reveal } from "@/app/components/Reveal";
import { HowItWorksSteps } from "@/app/components/HowItWorksSteps";
import { PairsTicker } from "@/app/components/PairsTicker";
import { PlannerDemo } from "@/app/components/PlannerDemo";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { ProductTabs } from "@/app/components/ProductTabs";
import { NumberTicker } from "@/app/components/beui/number-ticker";
import { Magnetic } from "@/app/components/beui/magnetic";
import { TextReveal } from "@/app/components/beui/text-reveal";
import { TiltCard } from "@/app/components/beui/tilt-card";
import { PricingSection, type CurrencyCode } from "@/app/components/PricingSection";
import { isBillingEnabled } from "@/app/lib/paystack";

const CAPABILITIES = [
  { value: 5, suffix: "", label: "safety checks run on every trade plan" },
  { value: 5, suffix: "", label: "simple calculators for safer position sizing" },
  { value: 5, suffix: "", label: "ready-made strategies you can test instantly" },
  { value: 2, suffix: "\u00A0yrs", label: "of real price history to practice with" },
  { value: 2, suffix: "", label: "ways trades land in your journal: planned or imported" },
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
    body: "We flag anything risky (no exit plan, betting too much, ignoring the trend) and say why.",
  },
  {
    n: "03",
    title: "See how it actually went",
    body: "Log the result. We check it against the plan you made, not just your memory of it.",
  },
];

const GRID_FEATURES = [
  {
    eyebrow: "Trade journal",
    title: "Your history, kept honest",
    body: "Every plan saves automatically and gets checked against what actually happened, not just what you remember.",
    stats: [
      ["Win rate", "58%"],
      ["Avg R", "0.8R"],
      ["Trades", "34"],
    ] as [string, string][],
  },
  {
    eyebrow: "Backtest engine",
    title: "Test it before you risk it",
    body: "Pick a template or describe your own strategy, then run it against real historical prices, costs included.",
    stats: [
      ["Trades", "24"],
      ["Win rate", "46%"],
      ["Profit factor", "1.31"],
    ] as [string, string][],
  },
  {
    eyebrow: "Risk calculator",
    title: "Know your exact risk",
    body: "Position size, margin, and correlated exposure, worked out automatically from your account and risk %.",
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
    a: "Yes. The planner, risk calculator, backtester, and journal are on every plan. Paid plans raise the monthly limits.",
  },
  {
    q: "Is this suitable if I have no trading experience?",
    a: "Yes. Every field explains itself in plain language; no prior terminology assumed.",
  },
  {
    q: "Can I import my existing trade history?",
    a: "Yes. Export a CSV from your broker or platform, whichever one you use, and if it has standard columns like symbol, entry/exit price, and date, we'll parse it straight into your journal.",
  },
  {
    q: "Does the system generate trade signals?",
    a: "No. It checks the risk structure of an idea you supply; it doesn't predict direction.",
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

function ToolPanel({
  eyebrow,
  title,
  body,
  bullets,
  visual,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: React.ReactNode[];
  visual: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-2 text-xl font-medium tracking-tight text-zinc-50">{title}</h3>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">{body}</p>
        {bullets && (
          <ul className="mt-6 space-y-2 text-sm text-zinc-400">
            {bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2">
                <Dot />
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </div>
      <TiltCard max={6} glare={false}>
        {visual}
      </TiltCard>
    </div>
  );
}

function StatsMock({ label, stats }: { label: string; stats: [string, string][] }) {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-5 text-left font-mono text-[13px]">
      <p className="border-b border-zinc-800 pb-3 text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <div className="mt-4 grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800">
        {stats.map(([name, value]) => (
          <div key={name} className="bg-zinc-950 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{name}</p>
            <p className="mt-1 text-lg text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">Illustrative example, not real account data.</p>
    </div>
  );
}

const [JOURNAL, BACKTEST, RISK] = GRID_FEATURES;

const PRODUCT_TABS = [
  {
    id: "planner",
    label: "Trade planner",
    dwellMs: 9000,
    content: (
      <ToolPanel
        eyebrow="Trade planner"
        title="Your idea, turned into a safe plan"
        body="Describe your trade in plain English. We turn it into a clear plan and check it for the mistakes beginners make most."
        bullets={[
          "Flags bad habits: chasing price, revenge trading, oversized bets",
          "Checked against the real, live price when you're entering at market",
          "Every question explains itself: no jargon",
        ]}
        visual={<PlannerDemo />}
      />
    ),
  },
  ...[
    { id: "journal", feature: JOURNAL, mock: "Journal summary" },
    { id: "backtest", feature: BACKTEST, mock: "Backtest result" },
    { id: "risk", feature: RISK, mock: "Risk calculation" },
  ].map(({ id, feature, mock }) => ({
    id,
    label: feature.eyebrow,
    content: (
      <ToolPanel
        eyebrow={feature.eyebrow}
        title={feature.title}
        body={feature.body}
        visual={<StatsMock label={mock} stats={feature.stats} />}
      />
    ),
  })),
];

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  ZA: "ZAR",
  GB: "GBP",
  NG: "NGN",
  US: "USD",
};

export default async function LandingPage() {
  // A DB hiccup here must not take down the entire marketing page for every
  // visitor; fall back to the logged-out view rather than erroring.
  let isLoggedIn = false;
  try {
    isLoggedIn = (await getSession()) !== null;
  } catch (error) {
    console.error("Landing page session check failed", error);
  }

  // Vercel's edge network sets this on every request; absent in local dev,
  // where it falls back to USD like any undetected visitor would.
  const headersList = await headers();
  const countryCode = headersList.get("x-vercel-ip-country") ?? "";
  const defaultCurrency: CurrencyCode = COUNTRY_TO_CURRENCY[countryCode] ?? "USD";
  const billingEnabled = isBillingEnabled();

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
            <Link href="/blog" className="hover:text-zinc-200">Blog</Link>
          </nav>
          <div className="flex items-center gap-4 sm:gap-5">
            <ThemeToggle />
            <NavAuthLink isLoggedIn={isLoggedIn} />
            <Link
              href={isLoggedIn ? "/planner" : "/signup"}
              className="border border-zinc-700 px-4 py-1.5 text-sm text-zinc-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-[0_0_20px_-6px_rgba(52,211,153,0.5)]"
            >
              {isLoggedIn ? "Open the planner" : "Get started"}
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
          <TextReveal
            as="h1"
            text={["Trade with a plan,", "not a guess."]}
            stagger={0.12}
            className="text-4xl font-medium leading-[1.15] tracking-tight text-zinc-50 sm:text-5xl"
          />
          <Reveal delay={600}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
              Describe your trade in plain English. We&apos;ll structure it, check it for
              mistakes, and track how it actually plays out.
            </p>
          </Reveal>
          <Reveal delay={800}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Magnetic>
                <Link
                  href={isLoggedIn ? "/planner" : "/signup"}
                  className="group block border border-zinc-100 bg-zinc-100 px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:bg-zinc-300 hover:shadow-[0_0_30px_-6px_rgba(52,211,153,0.6)]"
                >
                  {isLoggedIn ? "Open the planner" : "Get started"}
                  <span aria-hidden className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                </Link>
              </Magnetic>
              <a
                href="#pricing"
                className="border border-zinc-700 px-6 py-3 text-sm text-zinc-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-500"
              >
                See pricing
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
                <NumberTicker value={cap.value} suffix={cap.suffix} duration={1.4} stagger={0.1} blur />
              </p>
              <p className="mt-1 text-xs leading-snug text-zinc-500">{cap.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <PairsTicker />

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 py-24">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
            Three simple steps, every time
          </h2>
        </Reveal>
        <HowItWorksSteps steps={STEPS} />
      </section>

      {/* Feature spotlight + grid */}
      <section id="features" className="mx-auto w-full max-w-6xl border-t border-zinc-900 px-6 py-24">
        <Reveal>
          <ProductTabs tabs={PRODUCT_TABS} />
        </Reveal>
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
              Start free and upgrade when you need more. Paid plans renew monthly.
            </p>
          </Reveal>

          <PricingSection
            isLoggedIn={isLoggedIn}
            defaultCurrency={defaultCurrency}
            billingEnabled={billingEnabled}
          />
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
        <Reveal delay={100} className="mt-8">
          <FaqAccordion items={FAQS} />
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
            Free to start. No card required.
          </p>
          <div className="mt-8">
            <Link
              href={isLoggedIn ? "/planner" : "/signup"}
              className="group inline-block border border-zinc-100 bg-zinc-100 px-7 py-3 text-sm font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-300 hover:shadow-[0_0_30px_-6px_rgba(52,211,153,0.6)]"
            >
              {isLoggedIn ? "Open the planner" : "Get started"}
              <span aria-hidden className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
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
              <Link href="/contact" className="hover:text-zinc-300">
                Contact
              </Link>
              <Link href="/blog" className="hover:text-zinc-300">
                Blog
              </Link>
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
