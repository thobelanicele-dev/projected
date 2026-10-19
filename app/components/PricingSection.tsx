"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/app/components/Reveal";
import { PricingCTA } from "@/app/components/PricingCTA";
import { limitLines, limitTableRows } from "@/app/lib/planLimits";

export type CurrencyCode = "ZAR" | "USD" | "GBP" | "NGN";

const CURRENCIES: { code: CurrencyCode; country: string; symbol: string }[] = [
  { code: "ZAR", country: "South Africa", symbol: "R" },
  { code: "USD", country: "United States", symbol: "$" },
  { code: "GBP", country: "United Kingdom", symbol: "£" },
  { code: "NGN", country: "Nigeria", symbol: "₦" },
];

type TierKey = "free" | "basic" | "premium";

// Converted from live USD/ZAR, GBP/ZAR, USD/NGN rates and rounded to normal
// SaaS "charm" pricing per currency. Proposed starting points, not final —
// confirm/adjust before this goes live.
export const TIER_PRICING: Record<TierKey, Record<CurrencyCode, number>> = {
  free: { ZAR: 0, USD: 0, GBP: 0, NGN: 0 },
  basic: { ZAR: 199, USD: 11.99, GBP: 9.99, NGN: 15999 },
  premium: { ZAR: 499, USD: 29.99, GBP: 22.99, NGN: 39999 },
};

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

function formatPrice(amount: number, currency: CurrencyCode): string {
  if (amount === 0) return "Free";
  const symbol = CURRENCIES.find((c) => c.code === currency)!.symbol;
  const decimals = currency === "NGN" ? 0 : 2;
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
}

export function PricingSection({
  isLoggedIn,
  defaultCurrency,
  billingEnabled,
}: {
  isLoggedIn: boolean;
  defaultCurrency: CurrencyCode;
  billingEnabled: boolean;
}) {
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);

  return (
    <>
      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1">
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setCurrency(c.code)}
            aria-pressed={currency === c.code}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              currency === c.code ? "bg-zinc-100 text-black" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {c.code} · {c.country}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 divide-y divide-zinc-900 border border-zinc-900 md:grid-cols-3 md:divide-x md:divide-y-0">
        {TIERS.map((tier, i) => (
          <Reveal
            key={tier.key}
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
              <span className="text-3xl font-medium text-zinc-100">
                {formatPrice(TIER_PRICING[tier.key][currency], currency)}
              </span>
              {TIER_PRICING[tier.key][currency] > 0 && (
                <span className="text-sm text-zinc-500"> / month</span>
              )}
            </p>
            {tier.key !== "free" && currency !== "ZAR" && (
              <p className="mt-1 text-xs text-zinc-500">
                Approximate. Billed in South African Rand:{" "}
                {formatPrice(TIER_PRICING[tier.key].ZAR, "ZAR")} / month.
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
