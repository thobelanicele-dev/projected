"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { SPRING_LAYOUT } from "@/app/lib/beui/ease";

export interface ProductTab {
  id: string;
  label: string;
  content: ReactNode;
  /** How long this tab stays up before the next one shows, if it needs longer than the default. */
  dwellMs?: number;
}

// How long each tool stays on screen before the next one shows.
const AUTO_ADVANCE_MS = 6000;

export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  // Pointer or focus inside the tabs pauses the rotation, so nothing changes
  // under someone who is reading or about to click.
  const [paused, setPaused] = useState(false);
  // Once the visitor picks a tab themselves, they're in charge: stop rotating.
  const [tookOver, setTookOver] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });
  const reduce = useReducedMotion();
  const autoplay = !reduce && inView && !paused && !tookOver;

  useEffect(() => {
    if (!autoplay) return;
    const i = tabs.findIndex((t) => t.id === activeId);
    const timer = window.setTimeout(() => {
      setActiveId(tabs[(i + 1) % tabs.length].id);
    }, tabs[i]?.dwellMs ?? AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, activeId, tabs]);

  function choose(id: string) {
    setTookOver(true);
    setActiveId(id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setTookOver(true);
    const i = tabs.findIndex((t) => t.id === activeId);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    setActiveId(next.id);
    document.getElementById(`product-tab-${next.id}`)?.focus();
  }

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
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
              onClick={() => choose(tab.id)}
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
              {/* A thin bar fills while the next tool is on its way, so the rotation is easy to read. */}
              {active && autoplay && (
                <motion.span
                  key={`progress-${tab.id}`}
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: (tab.dwellMs ?? AUTO_ADVANCE_MS) / 1000, ease: "linear" }}
                  style={{ originX: 0 }}
                  className="absolute inset-x-0 -bottom-px h-[2px] bg-emerald-300"
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
