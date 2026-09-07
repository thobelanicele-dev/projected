"use client";

import { useState } from "react";
import type { TradePlan } from "@/app/api/plan/route";
import { loadChecklist, toggleChecklistItem } from "@/app/lib/planChecklist";

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

  const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecklist(journalEntryId));

  function toggle(id: string) {
    setChecked(toggleChecklistItem(journalEntryId, id, !checked[id]));
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
        {items.map((it) => (
          <li key={it.id}>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={!!checked[it.id]}
                onChange={() => toggle(it.id)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
              />
              <span className={checked[it.id] ? "text-zinc-600 line-through" : "text-zinc-300"}>{it.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
