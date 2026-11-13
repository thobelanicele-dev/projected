import Link from "next/link";
import { getSession } from "@/app/lib/auth/session";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { NavAuthLink } from "@/app/components/NavAuthLink";
import { Reveal } from "@/app/components/Reveal";
import { HowItWorksSteps } from "@/app/components/HowItWorksSteps";
import { PairsTicker } from "@/app/components/PairsTicker";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { NumberTicker } from "@/app/components/beui/number-ticker";
import { Magnetic } from "@/app/components/beui/magnetic";
import { TextReveal } from "@/app/components/beui/text-reveal";
import { PricingSection } from "@/app/components/PricingSection";
import { ProductShowcase } from "@/app/components/ProductShowcase";
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
      <span className="h-1 w-1 rounded-full bg-emerald-400" />
      {children}
    </p>
  );
}

export default async function LandingPage() {
  // A DB hiccup here must not take down the entire marketing page for every
  // visitor; fall back to the logged-out view rather than erroring.
  let isLoggedIn = false;
  try {
    isLoggedIn = (await getSession()) !== null;
  } catch (error) {
    console.error("Landing page session check failed", error);
  }

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
            <a href="#features" className="hover:text-zinc-200">Tools</a>
            <a href="#pricing" className="hover:text-zinc-200">Pricing</a>
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

      {/* The four tools, all on screen at once */}
      <section id="features" className="mx-auto w-full max-w-6xl border-t border-zinc-900 px-6 py-24">
        <Reveal>
          <Eyebrow>Tools</Eyebrow>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50">
            Four tools that work together
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <ProductShowcase />
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
