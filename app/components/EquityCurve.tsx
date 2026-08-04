export function EquityCurve({ points }: { points: { id: string; cumulativeR: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-zinc-500">
        Close at least 2 trades to see your equity curve.
      </p>
    );
  }

  const width = 400;
  const height = 100;
  const padding = 8;

  const values = points.map((p) => p.cumulativeR);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.cumulativeR - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const zeroY = height - padding - ((0 - min) / range) * (height - padding * 2);
  const isUp = values[values.length - 1] >= 0;

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
      <polyline
        points={coords.join(" ")}
        fill="none"
        strokeWidth={2}
        className={isUp ? "stroke-emerald-400" : "stroke-red-400"}
      />
    </svg>
  );
}
