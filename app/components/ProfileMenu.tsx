"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SessionUser } from "@/app/lib/auth/session";

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  plus: "Plus",
  premium: "Premium",
};

export function ProfileMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const initial = user.username.charAt(0).toUpperCase();
  const planLabel = user.plan ? (PLAN_LABELS[user.plan] ?? user.plan) : "Free";

  return (
    <div ref={menuRef} className="fixed right-6 top-6 z-40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
          <div className="border-b border-zinc-800 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-zinc-100">{user.username}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 text-sm">
            <span className="text-zinc-400">Plan</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-200">{planLabel}</span>
              {!user.plan && (
                <Link
                  href="/#pricing"
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300"
                >
                  Upgrade
                </Link>
              )}
            </span>
          </div>

          <div className="mt-1 border-t border-zinc-800 pt-1">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("fxinsites:replay-tour"));
                setOpen(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
            >
              Replay tour
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
