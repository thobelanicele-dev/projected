"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { TOAST_EVENT, type ToastInput, type ToastTone } from "@/app/lib/toast";

const SHOW_MS = 5000;
const MAX_TOASTS = 3;

interface Toast extends ToastInput {
  id: number;
}

const TONE_STYLE: Record<ToastTone, { dot: string; border: string }> = {
  success: { dot: "bg-emerald-400", border: "border-emerald-500/40" },
  warning: { dot: "bg-orange-400", border: "border-orange-500/40" },
  error: { dot: "bg-red-400", border: "border-red-500/40" },
};

/** Renders the notices raised with showToast(). Mounted once, in the app layout. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    const pending = timers.current;

    function onToast(e: Event) {
      const id = nextId.current++;
      const toast = { ...(e as CustomEvent<ToastInput>).detail, id };
      setToasts((current) => [...current, toast].slice(-MAX_TOASTS));
      pending.push(window.setTimeout(() => dismiss(id), SHOW_MS));
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      pending.forEach(window.clearTimeout);
    };
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONE_STYLE[toast.tone ?? "success"];
          return (
            <motion.div
              key={toast.id}
              layout={reduce ? false : "position"}
              role="status"
              initial={reduce ? false : { opacity: 0, y: -16, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-zinc-950 px-4 py-3 text-sm text-zinc-200 shadow-lg ${tone.border}`}
            >
              <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
              <div className="flex-1">
                <p>{toast.message}</p>
                {toast.href && (
                  <Link
                    href={toast.href}
                    onClick={() => dismiss(toast.id)}
                    className="mt-1 inline-block text-xs text-sky-400 hover:text-sky-300"
                  >
                    {toast.hrefLabel ?? "Open"}
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="text-zinc-500 transition-colors hover:text-zinc-200"
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
