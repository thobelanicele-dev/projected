"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV_ITEMS, HomeIcon, SearchIcon } from "@/app/components/appNav";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";
import { loadJournal } from "@/app/lib/journal";

export const OPEN_PALETTE_EVENT = "fxinsites:open-palette";

interface Command {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  run: () => void;
}

/** The "Jump to…" box: Ctrl/Cmd + K (or the search button) opens it. Type to filter, arrows to move, Enter to go. */
export function CommandPalette() {
  const router = useRouter();
  const userId = useCurrentUserId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const [trades, setTrades] = useState<{ id: string; label: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setText("");
    setActive(0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        close();
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
      const recent = loadJournal(userId).slice(0, 5);
      setTrades(
        recent.map((e) => ({
          id: e.id,
          label: `${e.instrument} ${e.direction}${e.outcome ? ` · ${e.outcome}` : e.status === "closed" ? "" : ` · ${e.status}`}`,
        }))
      );
    }, 0);
    return () => clearTimeout(timeout);
  }, [open, userId]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      close();
    };
    return [
      { id: "home", label: "Home", hint: "Start here", keywords: "home launcher start", run: go("/home") },
      ...NAV_ITEMS.map((n) => ({ id: n.href, label: n.label, hint: n.description, keywords: n.label, run: go(n.href) })),
      { id: "account", label: "Account settings", hint: "Email, password, plan", keywords: "account settings profile billing", run: go("/account") },
      {
        id: "tour",
        label: "Replay the tour",
        hint: "A quick walk through the app",
        keywords: "tour help guide",
        run: () => {
          close();
          window.dispatchEvent(new Event("fxinsites:replay-tour"));
        },
      },
      ...trades.map((t) => ({ id: `trade-${t.id}`, label: t.label, hint: "Open in your journal", keywords: t.label, run: go("/journal") })),
    ];
  }, [router, close, trades]);

  const results = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords}`.toLowerCase().includes(q));
  }, [commands, text]);

  if (!open) return null;

  const current = Math.min(active, Math.max(0, results.length - 1));

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(current + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[current]?.run();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[15vh]">
      <div onClick={close} aria-hidden="true" className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to"
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4">
          <span className="text-zinc-500"><SearchIcon /></span>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[current] ? `palette-${results[current].id}` : undefined}
            placeholder="Jump to a tool or trade"
            className="h-12 flex-1 bg-transparent text-sm text-zinc-50 outline-none placeholder:text-zinc-500"
          />
          <kbd className="rounded border border-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-500">Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">Nothing matches that.</li>}
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`palette-${c.id}`}
              role="option"
              aria-selected={i === current}
              onMouseEnter={() => setActive(i)}
              onClick={c.run}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                i === current ? "bg-zinc-900 text-zinc-50" : "text-zinc-300"
              }`}
            >
              <span className="flex items-center gap-2.5">
                {c.id === "home" && <HomeIcon />}
                {c.label}
              </span>
              <span className="truncate text-xs text-zinc-500">{c.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
