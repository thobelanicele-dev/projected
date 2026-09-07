export interface ChartLevels {
  entry: number | null;
  stopLoss: number | null;
  takeProfits: (number | null)[];
}

interface OverlayLine {
  key: string;
  label: string;
  fraction: number;
  border: string;
  text: string;
}

export function ChartOverlay({
  imageUrl,
  levels,
  takeProfitLabels,
}: {
  imageUrl: string;
  levels: ChartLevels;
  takeProfitLabels: string[];
}) {
  const lines: OverlayLine[] = [];

  if (levels.entry !== null) {
    lines.push({ key: "entry", label: "~Entry", fraction: levels.entry, border: "border-sky-400", text: "text-sky-300" });
  }
  if (levels.stopLoss !== null) {
    lines.push({ key: "stop", label: "~Stop loss", fraction: levels.stopLoss, border: "border-red-400", text: "text-red-300" });
  }
  levels.takeProfits.forEach((fraction, i) => {
    if (fraction !== null) {
      lines.push({
        key: `tp-${i}`,
        label: `~${takeProfitLabels[i] ?? "Target"}`,
        fraction,
        border: "border-emerald-400",
        text: "text-emerald-300",
      });
    }
  });

  if (lines.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-500">Approximate — estimated from your image, not measured.</p>
      <div className="relative overflow-hidden rounded-lg border border-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Your attached chart with estimated levels" className="block h-auto w-full" />
        {lines.map((l) => (
          <div
            key={l.key}
            className="absolute inset-x-0 flex items-center"
            style={{ top: `${l.fraction * 100}%` }}
          >
            <div className={`h-0 w-full border-t border-dashed ${l.border}`} />
            <span
              className={`absolute right-1.5 top-0 -translate-y-1/2 rounded bg-zinc-950/85 px-1.5 py-0.5 text-[10px] font-medium ${l.text}`}
            >
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
