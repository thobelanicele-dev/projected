"use client";

import { motion, useReducedMotion } from "motion/react";

export interface Step {
  n: string;
  title: string;
  body: string;
}

const DRAW_SECONDS = 1.8;

/** The three "How it works" steps, joined by a line that draws itself as the row scrolls into view. */
export function HowItWorksSteps({ steps }: { steps: Step[] }) {
  const reduce = useReducedMotion();
  const lineStagger = DRAW_SECONDS / steps.length;

  return (
    <div className="relative mt-10 grid grid-cols-1 divide-y divide-zinc-900 border-t border-zinc-900 md:grid-cols-3 md:divide-x md:divide-y-0">
      <motion.div
        aria-hidden
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: DRAW_SECONDS, ease: "easeInOut" }}
        className="absolute -top-px left-0 hidden h-px w-full origin-left bg-emerald-400/70 md:block"
      />
      {steps.map((step, i) => (
        <motion.div
          key={step.n}
          initial={reduce ? false : { opacity: 0.35 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, delay: i * lineStagger }}
          className="relative py-8 md:px-8 md:py-0 md:pt-8"
        >
          <motion.span
            aria-hidden
            initial={reduce ? false : { scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.5, delay: i * lineStagger }}
            className="absolute -top-[3px] hidden h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)] md:left-8 md:block"
          />
          <span className="font-mono text-xs text-emerald-500/70">{step.n}</span>
          <h3 className="mt-2 text-base font-medium text-zinc-100">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.body}</p>
        </motion.div>
      ))}
    </div>
  );
}
