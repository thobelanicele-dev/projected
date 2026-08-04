"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/planner", label: "Planner", description: "Build a structured trade plan" },
  {
    href: "/risk-calculator",
    label: "Risk calculator",
    description: "Size positions, check margin, spot correlation",
  },
  { href: "/backtest", label: "Backtest", description: "Test a strategy against real price history" },
  { href: "/journal", label: "Journal", description: "Log trades and track outcomes" },
  { href: "/dashboard", label: "Dashboard", description: "See how your plans matched reality" },
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
      <Link href="/" className="px-2.5 text-lg font-semibold tracking-tight text-zinc-50">
        FxInsites
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-2.5 py-2.5 transition-colors ${
                active ? "bg-zinc-900" : "hover:bg-zinc-900/60"
              }`}
            >
              <span
                className={`block text-sm font-medium ${active ? "text-zinc-50" : "text-zinc-300"}`}
              >
                {item.label}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">{item.description}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-auto rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900/60 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </aside>
  );
}
