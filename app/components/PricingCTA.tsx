"use client";

import Link from "next/link";
import { useState } from "react";
import type { Tier } from "@/app/lib/paystack";

interface PricingCTAProps {
  tier: Tier;
  label: string;
  isLoggedIn: boolean;
  highlighted: boolean;
}

const baseClass = "mt-8 border px-5 py-2.5 text-center text-sm transition-colors";
const highlightedClass = "border-zinc-100 bg-zinc-100 text-black hover:bg-zinc-300";
const normalClass = "border-zinc-700 text-zinc-200 hover:border-zinc-500";

export function PricingCTA({ tier, label, isLoggedIn, highlighted }: PricingCTAProps) {
  const [loading, setLoading] = useState(false);
  const className = `${baseClass} ${highlighted ? highlightedClass : normalClass}`;

  if (!isLoggedIn) {
    return (
      <Link href="/signup" className={className}>
        {label}
      </Link>
    );
  }

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
