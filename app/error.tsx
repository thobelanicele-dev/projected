"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled app error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-zinc-50">
      <span className="flex items-center gap-2 text-base font-medium tracking-tight text-zinc-100">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
        FxInsites
      </span>

      <h1 className="mt-10 text-2xl font-medium tracking-tight text-zinc-50 sm:text-3xl">
        Something went wrong on our end.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-500">
        Please try again in a moment. If this keeps happening, let us know at{" "}
        <a href="mailto:support.fxinsites@gmail.com" className="text-sky-400 hover:text-sky-300">
          support.fxinsites@gmail.com
        </a>
        .
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-block border border-zinc-100 bg-zinc-100 px-6 py-2.5 text-sm font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-300 hover:shadow-[0_0_30px_-6px_rgba(52,211,153,0.6)]"
      >
        Try again
      </button>
    </div>
  );
}
