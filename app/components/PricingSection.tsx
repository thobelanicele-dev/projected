"use client";

import Link from "next/link";
import { NumberTicker } from "@/app/components/beui/number-ticker";
import { Reveal } from "@/app/components/Reveal";
import { PricingCTA } from "@/app/components/PricingCTA";
import { limitLines, limitTableRows } from "@/app/lib/planLimits";
type TierKey = "free" | "basic" | "premium";

// Monthly prices in US Dollars. Every visitor sees the same price, wherever
// they are. The payment provider must charge these same amounts.
export const TIER_PRICING: Record<TierKey, number> = {
  free: 0,
  basic: 20,
  premium: 50,
};

const SYMBOL = "$";

/** "$20" for whole amounts, "$19.99" otherwise. */
export function formatPrice(amount: number): string {
  return `${SYMBOL}${formatNumber(amount, decimalsFor(amount))}`;
}

function decimalsFor(amount: number): number {
  return Number.isInteger(amount) ? 0 : 2;
}

const TIERS: {
  key: TierKey;
  name: string;
  tagline: string;
  highlighted: boolean;
}[] = [
  {
    key: "free",
    name: "Free",
    tagline: "Try it out, no card required",
    highlighted: false,
  },
  {
    key: "basic",
    name: "Basic",
    tagline: "For a regular trading routine",
    highlighted: true,
  },
  {
    key: "premium",
    name: "Premium",
    tagline: "For unrestricted use",
    highlighted: false,
  },
];

const COMPARISON_ROWS = [
  ...limitTableRows(),
  ["Risk-rule & bias checks", "Included", "Included", "Included"],
  ["Risk calculator (all 5 tools)", "Included", "Included", "Included"],
  ["CSV import, any broker", "Included", "Included", "Included"],
];

function Dot() {
  return <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />;
}

// A fixed locale, so the server and the visitor's browser always print the same text.
function formatNumber(amount: number, decimals: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function PricingSection({
  isLoggedIn,
  billingEnabled,
}: {
  isLoggedIn: boolean;
  billingEnabled: boolean;
}) {
  return (
    <>
      <div className="mt-8 grid grid-cols-1 divide-y divide-zinc-900 border border-zinc-900 md:grid-cols-3 md:divide-x md:divide-y-0">
        {TIERS.map((tier, i) => (
          <Reveal
            key={tier.key}
            delay={i * 100}
            spotlight
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
              <span className="text-3xl font-medium text-zinc-100">
                {TIER_PRICING[tier.key] === 0 ? (
                  "Free"
                ) : (
                  <NumberTicker
                    value={TIER_PRICING[tier.key]}
                    decimals={decimalsFor(TIER_PRICING[tier.key])}
                    prefix={SYMBOL}
                    format={(n) => formatNumber(n, decimalsFor(TIER_PRICING[tier.key]))}
                    duration={0.7}
                  />
                )}
              </span>
              {TIER_PRICING[tier.key] > 0 && (
                <span className="text-sm text-zinc-500"> / month</span>
              )}
            </p>
            {tier.key !== "free" && billingEnabled && (
              <p className="mt-1 text-xs text-zinc-500">
                Charged in South African Rand at checkout.
              </p>
            )}
            <ul className="mt-6 flex-1 space-y-2">
              {limitLines(tier.key).map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                  <Dot />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {tier.key !== "free" && billingEnabled ? (
              <PricingCTA
                tier={tier.key}
                label={`Choose ${tier.name}`}
                isLoggedIn={isLoggedIn}
                highlighted={tier.highlighted}
              />
            ) : (
              <Link
                href={isLoggedIn ? "/planner" : "/signup"}
                className={`mt-8 border px-5 py-2.5 text-center text-sm transition-colors ${
                  tier.highlighted
                    ? "border-zinc-100 bg-zinc-100 text-black hover:bg-zinc-300"
                    : "border-zinc-700 text-zinc-200 hover:border-zinc-500"
                }`}
              >
                {isLoggedIn ? "Open the planner" : "Get started free"}
              </Link>
            )}
          </Reveal>
        ))}
      </div>

      {/* Limits comparison table */}
      <div className="mt-8 overflow-x-auto border border-zinc-900">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-zinc-900 text-left">
              <th className="px-5 py-3 font-medium text-zinc-500">Included</th>
              <th className="px-5 py-3 text-center font-medium text-zinc-400">Free</th>
              <th className="px-5 py-3 text-center font-medium text-zinc-100">Basic</th>
              <th className="px-5 py-3 text-center font-medium text-zinc-400">Premium</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row[0]} className="border-b border-zinc-900 last:border-0">
                <td className="px-5 py-3 text-zinc-400">{row[0]}</td>
                {row.slice(1).map((v, i) => (
                  <td key={i} className="px-5 py-3 text-center text-zinc-300">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
