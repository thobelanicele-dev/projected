"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** The "building your plan" status line: a travelling light plus a message that swaps with a soft blur. */
export function LoadingNote({ message }: { message: string }) {
  const reduce = useReducedMotion();

  return (
    <div className="flex items-center gap-3 text-sm text-zinc-500" aria-live="polite">
      <span aria-hidden className="relative h-1 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-800">
        <span className="loader-bar absolute inset-y-0 w-1/3 rounded-full bg-emerald-400" />
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={message}
          initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(3px)" }}
          transition={{ duration: 0.25 }}
        >
          {message}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
