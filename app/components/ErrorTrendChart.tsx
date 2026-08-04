import type { TradeComparison } from "@/app/lib/dashboardStats";

export function ErrorTrendChart({ comparisons }: { comparisons: TradeComparison[] }) {
  if (comparisons.length < 2) {
    return (
      <p className="text-xs text-zinc-500">
        Close and log at least 2 AI-planned trades to see this chart.
      </p>
    );
  }

  const ordered = [...comparisons].reverse(); // oldest first, left to right

  const width = 400;
  const height = 100;
  const padding = 8;

  const values = ordered.map((c) => c.errorR);
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));

  const zeroY = height / 2;
  const barWidth = (width - padding * 2) / ordered.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full">
      <line
        x1={padding}
        y1={zeroY}
        x2={width - padding}
        y2={zeroY}
        stroke="currentColor"
        className="text-zinc-800"
        strokeDasharray="4 4"
      />
      {ordered.map((c, i) => {
        const barHeight = (Math.abs(c.errorR) / maxAbs) * (height / 2 - padding);
        const x = padding + i * barWidth + barWidth * 0.15;
        const w = barWidth * 0.7;
        const y = c.errorR >= 0 ? zeroY - barHeight : zeroY;
        return (
          <rect
            key={c.id}
            x={x}
            y={y}
            width={Math.max(1, w)}
            height={Math.max(1, barHeight)}
            className={c.errorR >= 0 ? "fill-emerald-400" : "fill-red-400"}
          />
        );
      })}
    </svg>
  );
}
