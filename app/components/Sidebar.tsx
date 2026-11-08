"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { NAV_ITEMS, HomeIcon } from "@/app/components/appNav";

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
          <Link href="/home" className="flex items-center gap-2 px-2.5 text-lg font-semibold tracking-tight text-zinc-50">
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
          <Link
            href="/home"
            aria-current={pathname === "/home" ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              pathname === "/home" ? "bg-zinc-900 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900/60"
            }`}
          >
            <HomeIcon />
            Home
          </Link>
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

        <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-4">
          <span className="px-2.5 text-xs text-zinc-500">Appearance</span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
