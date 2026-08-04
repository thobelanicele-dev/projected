import type { TradePlan } from "@/app/api/plan/route";

function formatPrice(price: number | null) {
  return price === null ? "—" : price.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

const severityStyles: Record<TradePlan["biasFlags"][number]["severity"], string> = {
  low: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  medium: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  high: "border-red-500/40 bg-red-500/10 text-red-300",
};

export function TradeCard({ plan }: { plan: TradePlan }) {
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-50 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Trade plan</p>
          <h2 className="text-2xl font-semibold">{plan.instrument}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            plan.direction === "long"
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {plan.direction === "long" ? "Long" : "Short"}
        </span>
      </div>

      <div className="space-y-5 py-5">
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Entry</p>
            <p className="text-lg font-medium">{formatPrice(plan.entry.price)}</p>
            <span className="text-xs text-zinc-500">({plan.entry.type})</span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{plan.entry.condition}</p>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="text-zinc-400">Before you pull the trigger:</span>{" "}
            {plan.entry.confirmation}
          </p>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Stop loss</p>
            <p className="text-lg font-medium text-red-400">{formatPrice(plan.stopLoss.price)}</p>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{plan.stopLoss.reasoning}</p>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="text-zinc-400">If this is hit:</span> {plan.stopLoss.invalidation}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Take profit</p>
          <div className="mt-1 space-y-3">
            {plan.takeProfits.map((tp, i) => (
              <div key={i}>
                <p className="text-lg font-medium text-emerald-400">{formatPrice(tp.price)}</p>
                <p className="text-sm text-zinc-400">{tp.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {plan.riskRewardRatio !== null && (
        <p className="text-sm text-zinc-400">
          Risk:Reward ≈ <span className="font-medium text-zinc-200">1:{plan.riskRewardRatio}</span>
        </p>
      )}

      <div className="mt-5 border-t border-zinc-800 pt-5">
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Rule-set check</p>
        <ul className="space-y-1.5">
          {plan.ruleChecks.map((check, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={check.passed ? "text-emerald-400" : "text-red-400"}>
                {check.passed ? "✓" : "✗"}
              </span>
              <span>
                <span className="font-medium">{check.rule}</span>
                {check.note && <span className="text-zinc-400"> — {check.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {plan.biasFlags.length > 0 && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Bias flags</p>
          <ul className="space-y-2">
            {plan.biasFlags.map((flag, i) => (
              <li
                key={i}
                className={`rounded-lg border px-3 py-2 text-sm ${severityStyles[flag.severity]}`}
              >
                <span className="font-medium">{flag.flag}</span>
                <span className="opacity-80"> — {flag.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.keyRisks.length > 0 && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Key risks</p>
          <ul className="space-y-1.5">
            {plan.keyRisks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-orange-400">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.watchFor.length > 0 && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Watch for</p>
          <ul className="space-y-1.5">
            {plan.watchFor.map((signal, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-sky-400">•</span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 rounded-lg bg-zinc-900 p-4 text-sm text-zinc-300">{plan.summary}</div>
    </div>
  );
}
