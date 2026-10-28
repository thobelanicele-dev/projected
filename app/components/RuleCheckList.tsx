"use client";

import { motion, useReducedMotion } from "motion/react";

export interface RuleCheck {
  rule: string;
  passed: boolean;
  note?: string | null;
}

/** The rule-set checks. Each one slides in and its tick pops, one after another, as the list is shown. */
export function RuleCheckList({ checks }: { checks: RuleCheck[] }) {
  const reduce = useReducedMotion();

  return (
    <ul className="mt-3 space-y-1.5">
      {checks.map((check, i) => (
        <motion.li
          key={i}
          initial={reduce ? false : { opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.12 }}
          className="flex items-start gap-2 text-sm"
        >
          <motion.span
            initial={reduce ? false : { scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 0.45, bounce: 0.55, delay: i * 0.12 + 0.1 }}
            className={check.passed ? "text-emerald-400" : "text-red-400"}
          >
            {check.passed ? "✓" : "✗"}
          </motion.span>
          <span>
            <span className="font-medium">{check.rule}</span>
            {check.note && <span className="text-zinc-400">: {check.note}</span>}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
