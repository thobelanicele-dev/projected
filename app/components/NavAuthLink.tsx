"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NavAuthLink({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="hidden text-sm text-zinc-400 hover:text-zinc-200 sm:block">
        Sign in
      </Link>
    );
  }

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
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="hidden text-sm text-zinc-400 hover:text-zinc-200 sm:block disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loggingOut ? "Logging out…" : "Log out"}
    </button>
  );
}
