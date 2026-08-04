import type { TradeComparison } from "@/app/lib/dashboardStats";

function formatDate(ts: number | null): string {
  if (ts === null) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccuracyTable({ comparisons }: { comparisons: TradeComparison[] }) {
  if (comparisons.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Close a few AI-planned trades and log the result to see planned-vs-actual here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left">
            <th className="px-4 py-2.5 font-medium text-zinc-500">Trade</th>
            <th className="px-4 py-2.5 font-medium text-zinc-500">Date</th>
            <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Plan expected</th>
            <th className="px-4 py-2.5 text-right font-medium text-zinc-500">
              What actually happened
            </th>
            <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Difference</th>
            <th className="px-4 py-2.5 text-right font-medium text-zinc-500">
              Entry price was off by
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => (
            <tr key={c.id} className="border-b border-zinc-900 last:border-0">
              <td className="px-4 py-2.5">
                <span className="text-zinc-100">{c.instrument}</span>{" "}
                <span className={c.direction === "long" ? "text-emerald-400" : "text-red-400"}>
                  {c.direction === "long" ? "long" : "short"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-zinc-400">{formatDate(c.closedAt)}</td>
              <td className="px-4 py-2.5 text-right text-zinc-300">{c.plannedR}× risk</td>
              <td className="px-4 py-2.5 text-right text-zinc-300">
                {c.actualR >= 0 ? "+" : ""}
                {c.actualR}× risk
              </td>
              <td
                className={`px-4 py-2.5 text-right font-medium ${
                  c.errorR >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {c.errorR >= 0 ? "+" : ""}
                {c.errorR}×
              </td>
              <td className="px-4 py-2.5 text-right text-zinc-400">
                {c.entryDeviationPct !== null ? `${c.entryDeviationPct}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
