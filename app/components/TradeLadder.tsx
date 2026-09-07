import type { TradePlan } from "@/app/api/plan/route";

function formatPrice(price: number): string {
  return price.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

const TOP = 24;
const PLOT_HEIGHT = 200;
const SPINE_X = 150;
const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 250;

function Fallback({ text }: { text: string }) {
  return <p className="text-xs text-zinc-500">{text}</p>;
}

export function TradeLadder({ plan }: { plan: TradePlan }) {
  const entry = plan.entry.price;
  const stop = plan.stopLoss.price;

  if (entry === null) {
    return <Fallback text="Add an entry price to see a visual diagram of this trade." />;
  }

  const targets = plan.takeProfits
    .map((tp, i) => ({
      label: plan.takeProfits.length > 1 ? `Target ${i + 1}` : "Target",
      price: tp.price,
    }))
    .filter((t): t is { label: string; price: number } => t.price !== null);

  if (stop === null && targets.length === 0) {
    return <Fallback text="Add a stop loss or target price to see this trade's risk and reward, visually." />;
  }

  const items = [
    { key: "entry", label: "Entry", price: entry },
    ...(stop !== null ? [{ key: "stop", label: "Stop loss", price: stop }] : []),
    ...targets.map((t, i) => ({ key: `tp-${i}`, label: t.label, price: t.price })),
  ];

  const prices = items.map((it) => it.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return <Fallback text="Entry, stop, and target are at the same price — nothing to diagram." />;
  }

  const padding = (max - min) * 0.12;
  const paddedMin = min - padding;
  const paddedMax = max + padding;
  const range = paddedMax - paddedMin;

  function toY(price: number) {
    return TOP + ((paddedMax - price) / range) * PLOT_HEIGHT;
  }

  const entryY = toY(entry);
  const stopY = stop !== null ? toY(stop) : null;
  const farthestTarget =
    targets.length > 0
      ? targets.reduce((a, b) => (Math.abs(b.price - entry) > Math.abs(a.price - entry) ? b : a))
      : null;
  const targetY = farthestTarget ? toY(farthestTarget.price) : null;

  const bandWidth = 10;
  const bandX = SPINE_X - bandWidth / 2;

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="h-[250px] w-full max-w-[360px]">
        <line
          x1={SPINE_X}
          y1={TOP}
          x2={SPINE_X}
          y2={TOP + PLOT_HEIGHT}
          className="stroke-zinc-800"
          strokeWidth={2}
        />

        {stopY !== null && (
          <>
            <rect
              x={bandX}
              y={Math.min(entryY, stopY)}
              width={bandWidth}
              height={Math.max(Math.abs(stopY - entryY), 1)}
              className="fill-red-500/25"
            />
            <text
              x={SPINE_X + 14}
              y={(entryY + stopY) / 2 + 3}
              className="fill-red-400 text-[9px] uppercase tracking-wide"
            >
              Risk
            </text>
          </>
        )}

        {targetY !== null && (
          <>
            <rect
              x={bandX}
              y={Math.min(entryY, targetY)}
              width={bandWidth}
              height={Math.max(Math.abs(targetY - entryY), 1)}
              className="fill-emerald-500/25"
            />
            <text
              x={SPINE_X + 14}
              y={(entryY + targetY) / 2 + 3}
              className="fill-emerald-400 text-[9px] uppercase tracking-wide"
            >
              Reward
            </text>
          </>
        )}

        {items.map((it) => {
          const y = toY(it.price);
          return (
            <g key={it.key}>
              <line x1={SPINE_X - 8} y1={y} x2={SPINE_X + 8} y2={y} className="stroke-zinc-400" strokeWidth={2} />
              <circle cx={SPINE_X} cy={y} r={3} className="fill-zinc-100" />
              <text x={SPINE_X - 14} y={y - 4} textAnchor="end" className="fill-zinc-400 text-[10px]">
                {it.label}
              </text>
              <text x={SPINE_X - 14} y={y + 10} textAnchor="end" className="fill-zinc-100 text-[11px] font-medium">
                {formatPrice(it.price)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
