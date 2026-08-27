"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[18px] w-[18px] shrink-0",
};

function PlannerIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function RiskCalculatorIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BacktestIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: "/planner", label: "Planner", description: "Build a structured trade plan", tourId: "nav-planner", Icon: PlannerIcon },
  {
    href: "/risk-calculator",
    label: "Risk calculator",
    description: "Size positions, check margin, spot correlation",
    tourId: "nav-risk-calculator",
    Icon: RiskCalculatorIcon,
  },
  {
    href: "/backtest",
    label: "Backtest",
    description: "Test a strategy against real price history",
    tourId: "nav-backtest",
    Icon: BacktestIcon,
  },
  {
    href: "/journal",
    label: "Journal",
    description: "Log trades and track outcomes",
    tourId: "nav-journal",
    Icon: JournalIcon,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "See how your plans matched reality",
    tourId: "nav-dashboard",
    Icon: DashboardIcon,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 px-4 py-8">
      <Link href="/" className="flex items-center gap-2 px-2.5 text-lg font-semibold tracking-tight text-zinc-50">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
        FxInsites
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={item.tourId}
              title={item.description}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                active ? "bg-zinc-900 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900/60"
              }`}
            >
              <item.Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("fxinsites:replay-tour"))}
        className="mt-auto rounded-lg px-2.5 py-2.5 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-900/60 hover:text-zinc-300"
      >
        Replay tour
      </button>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900/60 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </aside>
  );
}
