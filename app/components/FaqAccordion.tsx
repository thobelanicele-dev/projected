"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className="divide-y divide-zinc-900 border-t border-zinc-900">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q} className="py-4">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              aria-controls={`faq-panel-${i}`}
              className="group flex w-full items-center gap-2 text-left text-sm font-medium text-zinc-200 transition-colors hover:text-emerald-300"
            >
              <motion.span
                aria-hidden
                animate={{ rotate: open ? 45 : 0 }}
                transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.3 }}
                className="inline-block text-emerald-500/70"
              >
                +
              </motion.span>
              {item.q}
            </button>
            {/* Answers stay in the page (just collapsed) so search engines still read them. */}
            <motion.div
              id={`faq-panel-${i}`}
              initial={false}
              animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { height: { type: "spring", duration: 0.5, bounce: 0.15 }, opacity: { duration: 0.2 } }
              }
              inert={!open}
              aria-hidden={!open}
              className="overflow-hidden"
            >
              <p className="pt-3 pl-5 text-sm leading-relaxed text-zinc-500">{item.a}</p>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
