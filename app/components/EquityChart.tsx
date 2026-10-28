"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatR, type EquityCurveData } from "@/app/lib/dashboardInsights";

const W = 600;
const H = 220;
const PX = 10;
const PT = 18;
const PB = 14;

function formatMoney(n: number): string {
  const v = Math.round(n * 100) / 100;
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Your running total, one step per closed trade. Point at it (or use the arrow
 * keys) to read any trade, and switch between R and money. The biggest drop
 * from a peak is marked.
 */
export function EquityChart({ curve }: { curve: EquityCurveData }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"r" | "money">("r");
  const [hover, setHover] = useState<number | null>(null);

  const { points } = curve;
  const moneyMode = mode === "money" && curve.moneyCount > 0;
  const format = moneyMode ? formatMoney : formatR;

  if (points.length < 2) {
    return <p className="text-sm text-zinc-500">Close at least 2 trades with a result to see your running total.</p>;
  }

  const values = points.map((p) => (moneyMode ? p.cumMoney ?? 0 : p.cumR));
  const series = [0, ...values]; // the curve starts at zero, before the first trade
  const n = series.length;
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;
  const x = (i: number) => PX + (i / (n - 1)) * (W - PX * 2);
  const y = (v: number) => PT + (1 - (v - min) / range) * (H - PT - PB);
  const line = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${line} ${x(n - 1)},${y(0)} ${x(0)},${y(0)}`;
  const up = series[n - 1] >= 0;

  const drawdown = moneyMode ? curve.drawdownMoney : curve.drawdownR;
  // The curve's own index 0 is the start, so a point's index is one more than its trade's.
  const ddPeak = drawdown ? drawdown.peakIndex + 1 : null;
  const ddTrough = drawdown ? drawdown.troughIndex + 1 : null;

  // The remembered position can outlive the data (switching to a shorter time range), so ignore it if it's out of range.
  const hoverIndex = hover !== null && hover >= 1 && hover <= n - 1 ? hover : null;
  const shown = hoverIndex ?? n - 1;
  const point = points[shown - 1];

  function onPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const view = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((view - PX) / (W - PX * 2)) * (n - 1));
    setHover(Math.min(n - 1, Math.max(1, i)));
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    setHover(Math.min(n - 1, Math.max(1, (hoverIndex ?? n - 1) + step)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-h-[2.5rem]" aria-live="polite">
          <p className="text-sm text-zinc-100">
            {hoverIndex === null ? "Latest trade" : formatDay(point.ts)}
            <span className="text-zinc-500"> · {point.instrument} {point.direction}</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatR(point.r)}
            {point.money !== null ? ` (${formatMoney(point.money)})` : ""} · running total{" "}
            <span className={values[shown - 1] >= 0 ? "text-emerald-400" : "text-red-400"}>{format(values[shown - 1])}</span>
          </p>
        </div>
        <div className="inline-flex rounded-full border border-zinc-800 p-0.5 text-xs">
          {(["r", "money"] as const).map((m) => {
            const disabled = m === "money" && curve.moneyCount === 0;
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                title={disabled ? "Enter a profit or loss when you close a trade in the journal to see this" : undefined}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  (m === "money") === moneyMode ? "bg-zinc-100 text-black" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {m === "r" ? "In R" : "In money"}
              </button>
            );
          })}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 h-52 w-full touch-pan-y outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
        role="img"
        aria-label={`Running total over ${points.length} closed trades, ending at ${format(series[n - 1])}. Use the left and right arrow keys to read each trade.`}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        <line x1={PX} y1={y(0)} x2={W - PX} y2={y(0)} stroke="currentColor" className="text-zinc-800" strokeDasharray="4 4" />
        <g className={up ? "text-emerald-400" : "text-red-400"}>
          <polygon points={area} fill="currentColor" fillOpacity={0.08} />
          <motion.polyline
            key={`${mode}-${line}`}
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </g>

        {drawdown && ddPeak !== null && ddTrough !== null && (
          <g className="text-orange-400">
            <line x1={x(ddPeak)} y1={y(series[ddPeak])} x2={x(ddTrough)} y2={y(series[ddTrough])} stroke="currentColor" strokeDasharray="3 3" strokeWidth={1.5} />
            <circle cx={x(ddPeak)} cy={y(series[ddPeak])} r={3} fill="currentColor" />
            <circle cx={x(ddTrough)} cy={y(series[ddTrough])} r={3} fill="currentColor" />
          </g>
        )}

        {hoverIndex !== null && (
          <g>
            <line x1={x(hoverIndex)} y1={PT - 6} x2={x(hoverIndex)} y2={H - PB} stroke="currentColor" className="text-zinc-600" strokeWidth={1} />
            <circle cx={x(hoverIndex)} cy={y(series[hoverIndex])} r={4} className="fill-zinc-50" />
          </g>
        )}
      </svg>

      <div className="mt-2 space-y-0.5 text-[11px] text-zinc-500">
        {drawdown ? (
          <p>
            <span className="text-orange-400">Biggest drop:</span> {moneyMode ? formatMoney(-drawdown.depth) : formatR(-drawdown.depth)} from a peak (the dashed orange line). This is the worst losing stretch in this period.
          </p>
        ) : (
          <p>No drop from a peak in this period.</p>
        )}
        {moneyMode && curve.moneyCount < points.length && (
          <p>The money line only counts the {curve.moneyCount} of {points.length} trades where you entered a profit or loss.</p>
        )}
        <p>Each step is one closed trade. Point at the line, or press the arrow keys, to read a trade.</p>
      </div>
    </div>
  );
}
