"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SPRING_LAYOUT } from "@/app/lib/beui/ease";

export interface ProductTab {
  id: string;
  label: string;
  content: ReactNode;
}

export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  const reduce = useReducedMotion();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === activeId);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    setActiveId(next.id);
    document.getElementById(`product-tab-${next.id}`)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Product tools"
        onKeyDown={onKeyDown}
        className="flex overflow-x-auto border-b border-zinc-900"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={`product-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`product-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              className={`relative mr-8 whitespace-nowrap py-3 text-sm transition-colors ${
                active ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {active && (
                <motion.span
                  layoutId="product-tab-underline"
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="absolute inset-x-0 -bottom-px h-px bg-emerald-400"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Every panel stays in the page (hidden, not removed) so the text is still readable by search engines. */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`product-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`product-tab-${tab.id}`}
          hidden={tab.id !== activeId}
          className="tab-panel-in pt-10"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
