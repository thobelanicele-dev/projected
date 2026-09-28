"use client";

import { useState } from "react";
import { getPipSize, parsePair } from "@/app/lib/riskCalculator";

// Mirrors TradeLadder.tsx's visual constants and toY math exactly, so the
// input-side ladder here and the output-side one feel like the same object
// at two points in the trade's life. Kept as a separate component (not a
// shared import) since this one renders in-progress, possibly-null fields
// with ghost markers and entry-mode branching that don't belong on the
// output card.
const TOP = 24;
const PLOT_HEIGHT = 200;
const SPINE_X = 150;
const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 250;

type PriceField = "entryPrice" | "stopLossPrice" | "takeProfitPrice";

interface PricePlanLadderProps {
  pair: string;
  entryMode: "now" | "condition";
  livePrice: number | null;
  entryPrice: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  onChange: (field: PriceField, value: string) => void;
}

function parseNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function Marker({
  y,
  price,
  formattedPrice,
  label,
  colorClass,
  isGhost,
  draggable,
  onPointerDown,
  onKeyDown,
}: {
  y: number;
  price: number;
  formattedPrice: string;
  label: string;
  colorClass: string;
  isGhost: boolean;
  draggable: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <g
      onPointerDown={draggable ? onPointerDown : undefined}
      onKeyDown={draggable ? onKeyDown : undefined}
      tabIndex={draggable ? 0 : undefined}
      role={draggable ? "slider" : undefined}
      aria-label={draggable ? label : undefined}
      aria-valuenow={draggable ? price : undefined}
      className={draggable ? "cursor-ns-resize outline-none" : undefined}
    >
      {draggable && <circle cx={SPINE_X} cy={y} r={22} className="fill-transparent" />}
      <line
        x1={SPINE_X - 8}
        y1={y}
        x2={SPINE_X + 8}
        y2={y}
        className={colorClass}
        strokeWidth={2}
        strokeDasharray={isGhost ? "3 3" : undefined}
      />
      <circle cx={SPINE_X} cy={y} r={3} className={isGhost ? "fill-none stroke-zinc-500" : "fill-zinc-100"} />
      <text x={SPINE_X - 14} y={y - 4} textAnchor="end" className="fill-zinc-400 text-[10px]">
        {isGhost ? `${label} (drag to set)` : label}
      </text>
      <text
        x={SPINE_X - 14}
        y={y + 10}
        textAnchor="end"
        className={isGhost ? "fill-zinc-600 text-[11px]" : "fill-zinc-100 text-[11px] font-medium"}
      >
        {formattedPrice}
      </text>
    </g>
  );
}

export function PricePlanLadder({
  pair,
  entryMode,
  livePrice,
  entryPrice,
  stopLossPrice,
  takeProfitPrice,
  onChange,
}: PricePlanLadderProps) {
  const [dragging, setDragging] = useState<PriceField | null>(null);

  const pipSize = getPipSize(parsePair(pair)?.quote ?? "USD");
  const decimals = Math.max(0, Math.ceil(-Math.log10(pipSize)) + 1);

  const entryVal = entryMode === "now" ? livePrice : parseNum(entryPrice);
  const stopVal = parseNum(stopLossPrice);
  const targetVal = parseNum(takeProfitPrice);
  const anchor = entryVal ?? livePrice;

  if (anchor === null) {
    return (
      <p className="text-sm text-zinc-500">
        Pick an instrument to see a live price ladder here, or just type prices below.
      </p>
    );
  }

  // Ghost defaults are a flat offset from the anchor, deliberately not derived
  // from the padded range below, that would create a feedback loop where
  // dragging one marker far away also drags the *other*, still-ghost marker's
  // default position outside the newly-computed range.
  const stopIsGhost = stopVal === null;
  const targetIsGhost = targetVal === null;
  const defaultOffset = Math.abs(anchor) * 0.006 || 1;
  const stopDisplay = stopVal ?? anchor - defaultOffset;
  const targetDisplay = targetVal ?? anchor + defaultOffset;

  // The plotted range is derived from everything actually being rendered
  // (real or ghost), so nothing, including a still-ghost marker, ever ends up
  // outside the padded viewport.
  const plotted = [anchor, stopDisplay, targetDisplay];
  let min = Math.min(...plotted);
  let max = Math.max(...plotted);
  if (min === max) {
    const span = Math.abs(anchor) * 0.015 || 1;
    min = anchor - span;
    max = anchor + span;
  }
  const padding = (max - min) * 0.15;
  const paddedMin = min - padding;
  const paddedMax = max + padding;
  const range = paddedMax - paddedMin || 1;

  function toY(price: number) {
    return TOP + ((paddedMax - price) / range) * PLOT_HEIGHT;
  }
  function toPrice(y: number) {
    const raw = paddedMax - ((y - TOP) / PLOT_HEIGHT) * range;
    return Math.round(raw / pipSize) * pipSize;
  }
  function formatPrice(price: number) {
    return price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  const entryY = toY(anchor);
  const stopY = toY(stopDisplay);
  const targetY = toY(targetDisplay);
  const bandWidth = 10;
  const bandX = SPINE_X - bandWidth / 2;

  function commit(field: PriceField, price: number) {
    onChange(field, price.toFixed(decimals));
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const localY = ((e.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    const clamped = Math.min(Math.max(localY, TOP), TOP + PLOT_HEIGHT);
    commit(dragging, toPrice(clamped));
  }
  function stopDragging() {
    setDragging(null);
  }

  function handlePointerDownFor(field: PriceField, currentPrice: number, isGhost: boolean) {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(field);
      if (isGhost) commit(field, currentPrice);
    };
  }
  function handleKeyDownFor(field: PriceField, currentPrice: number) {
    return (e: React.KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        commit(field, currentPrice + pipSize);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        commit(field, currentPrice - pipSize);
      }
    };
  }

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-[250px] w-full max-w-[360px] touch-none select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
        onPointerCancel={stopDragging}
      >
        <line x1={SPINE_X} y1={TOP} x2={SPINE_X} y2={TOP + PLOT_HEIGHT} className="stroke-zinc-800" strokeWidth={2} />

        <rect
          x={bandX}
          y={Math.min(entryY, stopY)}
          width={bandWidth}
          height={Math.max(Math.abs(stopY - entryY), 1)}
          className={stopIsGhost ? "fill-red-500/10" : "fill-red-500/25"}
        />
        <rect
          x={bandX}
          y={Math.min(entryY, targetY)}
          width={bandWidth}
          height={Math.max(Math.abs(targetY - entryY), 1)}
          className={targetIsGhost ? "fill-emerald-500/10" : "fill-emerald-500/25"}
        />

        {livePrice !== null && Math.abs(livePrice - anchor) > pipSize && (
          <line
            x1={SPINE_X - 8}
            y1={toY(livePrice)}
            x2={SPINE_X + 8}
            y2={toY(livePrice)}
            className="stroke-sky-400/60"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        <Marker
          y={entryY}
          price={anchor}
          formattedPrice={formatPrice(anchor)}
          label={entryMode === "now" ? "Entry (market)" : "Entry"}
          colorClass="stroke-zinc-400"
          isGhost={false}
          draggable={entryMode === "condition"}
          onPointerDown={handlePointerDownFor("entryPrice", anchor, false)}
          onKeyDown={handleKeyDownFor("entryPrice", anchor)}
        />
        <Marker
          y={stopY}
          price={stopDisplay}
          formattedPrice={formatPrice(stopDisplay)}
          label="Stop loss"
          colorClass="stroke-red-400"
          isGhost={stopIsGhost}
          draggable
          onPointerDown={handlePointerDownFor("stopLossPrice", stopDisplay, stopIsGhost)}
          onKeyDown={handleKeyDownFor("stopLossPrice", stopDisplay)}
        />
        <Marker
          y={targetY}
          price={targetDisplay}
          formattedPrice={formatPrice(targetDisplay)}
          label="Take profit"
          colorClass="stroke-emerald-400"
          isGhost={targetIsGhost}
          draggable
          onPointerDown={handlePointerDownFor("takeProfitPrice", targetDisplay, targetIsGhost)}
          onKeyDown={handleKeyDownFor("takeProfitPrice", targetDisplay)}
        />
      </svg>
    </div>
  );
}
