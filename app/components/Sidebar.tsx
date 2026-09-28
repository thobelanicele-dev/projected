"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Mobile and desktop each remember their own open/closed preference, rather
// than sharing one flag: closing the sidebar on your phone shouldn't also
// hide it on your laptop.
const MOBILE_KEY = "fxinsites.sidebarMobileOpen";
const DESKTOP_KEY = "fxinsites.sidebarDesktopOpen";
const DESKTOP_QUERY = "(min-width: 768px)"; // matches Tailwind's `md` breakpoint

type TriState = boolean | null; // null = no explicit preference yet, use the CSS default

function loadPref(key: string): TriState {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === "1" ? true : raw === "0" ? false : null;
  } catch {
    return null;
  }
}

function savePref(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore
  }
}

function isDesktopViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

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
  // null = no explicit preference yet: falls back to the CSS defaults below
  // (hidden off-canvas on mobile, visible as a column on desktop).
  const [mobileOpen, setMobileOpen] = useState<TriState>(null);
  const [desktopOpen, setDesktopOpen] = useState<TriState>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setMobileOpen(loadPref(MOBILE_KEY));
      setDesktopOpen(loadPref(DESKTOP_KEY));
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function open() {
    if (isDesktopViewport()) {
      setDesktopOpen(true);
      savePref(DESKTOP_KEY, true);
    } else {
      setMobileOpen(true);
      savePref(MOBILE_KEY, true);
    }
  }
  function close() {
    if (isDesktopViewport()) {
      setDesktopOpen(false);
      savePref(DESKTOP_KEY, false);
    } else {
      setMobileOpen(false);
      savePref(MOBILE_KEY, false);
    }
  }

  const visibleOnMobile = mobileOpen === true;
  const visibleOnDesktop = desktopOpen !== false;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Open sidebar"
        className={`fixed left-4 top-4 z-40 h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/90 text-zinc-300 backdrop-blur transition-colors hover:text-zinc-50 ${
          visibleOnMobile ? "hidden" : "flex"
        } ${visibleOnDesktop ? "md:hidden" : "md:flex"}`}
      >
        <MenuIcon />
      </button>

      {visibleOnMobile && (
        <div
          onClick={close}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 px-4 py-8 transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:transition-[width] md:duration-200 ${
          visibleOnMobile ? "translate-x-0" : "-translate-x-full"
        } ${visibleOnDesktop ? "md:w-60 md:translate-x-0 md:px-4" : "md:w-0 md:translate-x-0 md:overflow-hidden md:border-r-0 md:px-0"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 px-2.5 text-lg font-semibold tracking-tight text-zinc-50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
            FxInsites
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Close sidebar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
          >
            <CloseIcon />
          </button>
        </div>

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
      </aside>
    </>
  );
}
