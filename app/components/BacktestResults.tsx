import { EquityCurve } from "@/app/components/EquityCurve";
import type { BacktestResult } from "@/app/lib/backtestEngine";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-50">{value}</p>
    </div>
  );
}

export function BacktestResults({ result }: { result: BacktestResult }) {
  const { stats, trades } = result;

  return (
    <div className="mt-10 w-full max-w-2xl">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Results</p>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total trades" value={String(stats.totalTrades)} />
        <StatTile label="Win rate" value={stats.winRate !== null ? `${stats.winRate}%` : "—"} />
        <StatTile label="Avg R" value={stats.avgR !== null ? `${stats.avgR}R` : "—"} />
        <StatTile
          label="Profit factor"
          value={stats.profitFactor !== null ? stats.profitFactor.toString() : "—"}
        />
        <StatTile
          label="Max drawdown"
          value={stats.maxDrawdownR !== null ? `${stats.maxDrawdownR}R` : "—"}
        />
        <StatTile label="Losses" value={String(stats.losses)} />
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Equity curve (R)</p>
        <EquityCurve
          points={stats.equityCurve.map((p) => ({ id: p.date, cumulativeR: p.cumulativeR }))}
        />
      </div>

      {trades.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No trades were triggered by this strategy over this period. Try a longer history, a
          different template, or looser parameters.
        </p>
      ) : (
        <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-zinc-900 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Entry</th>
                <th className="px-3 py-2 font-medium">Dir</th>
                <th className="px-3 py-2 font-medium">Exit</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 text-right font-medium">R</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-300">
                    {t.entryDate} @ {t.entryPrice}
                  </td>
                  <td className={t.direction === "long" ? "px-3 py-2 text-emerald-400" : "px-3 py-2 text-red-400"}>
                    {t.direction === "long" ? "Long" : "Short"}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {t.exitDate} @ {t.exitPrice}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{t.exitReason}</td>
                  <td
                    className={
                      t.rMultiple >= 0
                        ? "px-3 py-2 text-right text-emerald-400"
                        : "px-3 py-2 text-right text-red-400"
                    }
                  >
                    {t.rMultiple}R
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
