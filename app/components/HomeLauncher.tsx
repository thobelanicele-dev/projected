"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/app/components/appNav";
import { OPEN_PALETTE_EVENT } from "@/app/components/CommandPalette";
import { NAV_ITEMS } from "@/app/components/appNav";
import { PlanUsageNote } from "@/app/components/PlanUsageNote";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";
import { loadJournal, type JournalEntry } from "@/app/lib/journal";

const CARDS = [
  { href: "/planner", title: "Plan a trade", body: "Turn an idea into an entry, stop and target, then check it against your rules." },
  { href: "/risk-calculator", title: "Size a position", body: "Position size, pip value, margin and correlation, with one set of inputs." },
  { href: "/backtest", title: "Test an idea", body: "Run a strategy in plain English on real price history." },
  { href: "/dashboard", title: "Review", body: "See how your plans matched what the market did." },
];

const iconFor = (href: string) => NAV_ITEMS.find((n) => n.href === href)?.Icon;

function describe(e: JournalEntry): string {
  if (e.outcome) return e.outcome === "breakeven" ? "Breakeven" : e.outcome === "win" ? "Win" : "Loss";
  return e.status === "planned" ? "Planned" : e.status === "open" ? "Open" : "Closed";
}

/** The front door: four things you can do, this month's allowance, and the last few trades. */
export function HomeLauncher({ username }: { username: string }) {
  const userId = useCurrentUserId();
  const [recent, setRecent] = useState<JournalEntry[] | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setRecent(loadJournal(userId).slice(0, 4)), 0);
    return () => clearTimeout(timeout);
  }, [userId]);

  return (
    <div>
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="text-sm text-zinc-500">{username ? `Welcome back, ${username}` : "Welcome back"}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">What are you working on?</h1>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
          className="mt-6 flex h-12 w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
        >
          <SearchIcon />
          <span>Jump to a tool or trade</span>
          <kbd className="ml-auto hidden rounded border border-zinc-800 px-1.5 py-0.5 text-[11px] sm:inline">Ctrl K</kbd>
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = iconFor(card.href);
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-zinc-600"
            >
              <span className="text-emerald-400">{Icon && <Icon />}</span>
              <span className="text-base font-medium text-zinc-50">{card.title}</span>
              <span className="text-sm leading-relaxed text-zinc-400">{card.body}</span>
              <span className="mt-auto pt-2 text-sm text-zinc-500 transition-colors group-hover:text-zinc-200">Open →</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">Recent trades</h2>
            <Link href="/journal" className="text-xs text-sky-400 hover:text-sky-300">
              Open journal
            </Link>
          </div>

          {recent === null ? (
            <p className="mt-4 text-sm text-zinc-500">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              Your plans and trades show up here once you build your first plan.{" "}
              <Link href="/planner" className="text-sky-400 hover:text-sky-300">
                Plan a trade
              </Link>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-800">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-zinc-200">
                    {e.instrument} <span className="text-zinc-500">{e.direction}</span>
                  </span>
                  <span className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{describe(e)}</span>
                    <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-950 p-5 lg:col-span-2">
          <div>
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">This month</h2>
            <PlanUsageNote metric="aiPlans" noun="AI trade plans" />
            <PlanUsageNote metric="backtestRuns" noun="backtest runs" />
          </div>
          <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-800 pt-4 text-sm">
            <Link href="/weekly" className="text-sky-400 hover:text-sky-300">
              Weekly summary
            </Link>
            <Link href="/dashboard" className="text-sky-400 hover:text-sky-300">
              Dashboard
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
