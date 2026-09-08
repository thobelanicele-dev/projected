"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { acknowledgeCookies, hasAcknowledgedCookies } from "@/app/lib/cookieConsent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasAcknowledgedCookies()) setVisible(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function dismiss() {
    acknowledgeCookies();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-6 py-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-zinc-400">
          We use one essential cookie to keep you logged in — that&apos;s it. No tracking or
          advertising cookies. See our{" "}
          <Link href="/privacy" className="text-sky-400 hover:text-sky-300">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
