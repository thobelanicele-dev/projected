"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { TradePlan } from "@/app/api/plan/route";
import { loadChecklist, toggleChecklistItem } from "@/app/lib/planChecklist";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";

interface ChecklistItem {
  id: string;
  text: string;
}

export function TradeChecklist({ plan, journalEntryId }: { plan: TradePlan; journalEntryId: string }) {
  const items: ChecklistItem[] = [
    { id: "entryConfirmation-0", text: plan.entry.confirmation },
    ...plan.watchFor.map((text, i) => ({ id: `watchFor-${i}`, text })),
    ...plan.keyRisks.map((text, i) => ({ id: `keyRisks-${i}`, text: `Risk to watch: ${text}` })),
  ];

  const userId = useCurrentUserId();
  const reduce = useReducedMotion();
  const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecklist(journalEntryId, userId));

  function toggle(id: string) {
    setChecked(toggleChecklistItem(journalEntryId, id, !checked[id], userId));
  }

  if (items.length === 0) return null;

  const checkedCount = items.filter((it) => checked[it.id]).length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Before &amp; during the trade</p>
        <span className="text-xs font-medium text-zinc-400">
          {checkedCount}/{items.length} checked
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <motion.li
            key={it.id}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={!!checked[it.id]}
                onChange={() => toggle(it.id)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/60 ${
                  checked[it.id] ? "border-emerald-500 bg-emerald-500" : "border-zinc-700 bg-zinc-900"
                }`}
              >
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="M2.5 6.3l2.4 2.4 4.6-5"
                    className="text-black"
                    initial={false}
                    animate={{ pathLength: checked[it.id] ? 1 : 0, opacity: checked[it.id] ? 1 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
                  />
                </svg>
              </span>
              <span className={checked[it.id] ? "text-zinc-600 line-through" : "text-zinc-300"}>{it.text}</span>
            </label>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
