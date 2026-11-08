"use client";

import { SearchIcon } from "@/app/components/appNav";
import { OPEN_PALETTE_EVENT } from "@/app/components/CommandPalette";

/**
 * The strip across the top of every signed-in page, with the Jump to box in
 * the middle. It stays put when the side menu is closed. The side padding
 * keeps the box clear of the menu button (left) and the account button (right).
 */
export function JumpToBar() {
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-center border-b border-zinc-800 bg-black/90 px-16 backdrop-blur">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
        aria-label="Jump to a tool or trade"
        className="flex h-10 w-full max-w-md items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-left text-sm text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
      >
        <SearchIcon />
        <span className="truncate">Jump to a tool or trade</span>
        <kbd className="ml-auto hidden rounded border border-zinc-800 px-1.5 py-0.5 text-[11px] sm:inline">Ctrl K</kbd>
      </button>
    </div>
  );
}
