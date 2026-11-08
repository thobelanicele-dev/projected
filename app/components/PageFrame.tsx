"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NAV_ITEMS } from "@/app/components/appNav";

// Pages that are mostly charts and lists get more room; the form-style pages
// (planner, calculator, account) stay at a width that is comfortable to read.
const WIDTHS: Record<string, string> = {
  "/home": "max-w-5xl",
  "/dashboard": "max-w-4xl",
  "/weekly": "max-w-4xl",
  "/journal": "max-w-4xl",
  "/backtest": "max-w-4xl",
};

const EXTRA_TITLES: Record<string, string> = { "/account": "Account settings" };

/** Sets the page width for the current route and shows "Home / Page" above every tool. */
export function PageFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const width = WIDTHS[pathname] ?? "max-w-2xl";
  const title = NAV_ITEMS.find((n) => n.href === pathname)?.label ?? EXTRA_TITLES[pathname];

  return (
    <div className={`w-full min-w-0 ${width}`}>
      {title && (
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/home" className="transition-colors hover:text-zinc-300">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-zinc-300">{title}</span>
        </nav>
      )}
      {children}
    </div>
  );
}
