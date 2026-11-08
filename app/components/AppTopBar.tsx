"use client";

import Link from "next/link";
import { SearchIcon } from "@/app/components/appNav";
import { ToolNav } from "@/app/components/ToolNav";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { OPEN_PALETTE_EVENT } from "@/app/components/CommandPalette";
import type { ReactNode } from "react";

/** The slim bar across the top of every signed-in page. The account menu is passed in so it stays a server-fed component. */
export function AppTopBar({ profile }: { profile: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
        <Link href="/home" className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-zinc-50">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
          FxInsites
        </Link>

        <ToolNav />

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
          aria-label="Jump to a tool or trade"
          className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300 md:w-52"
        >
          <SearchIcon />
          <span className="hidden md:inline">Jump to…</span>
          <kbd className="ml-auto hidden rounded border border-zinc-800 px-1.5 py-0.5 text-[11px] md:inline">Ctrl K</kbd>
        </button>

        <ThemeToggle />
        {profile}
      </div>
    </header>
  );
}
