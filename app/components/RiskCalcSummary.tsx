import type { FieldErrors } from "@/app/lib/riskCalculator";

export interface ResultStat {
  label: string;
  value: string;
  tone?: "default" | "danger";
}

export function RiskCalcSummary({
  stats,
  warnings,
  errors,
}: {
  stats?: ResultStat[];
  warnings?: string[];
  errors?: FieldErrors | null;
}) {
  if (errors && Object.keys(errors).length > 0) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        <ul className="space-y-1">
          {Object.entries(errors).map(([field, message]) => (
            <li key={field}>{message}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!stats || stats.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-lg font-medium ${s.tone === "danger" ? "text-red-400" : "text-zinc-50"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {warnings && warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-zinc-800 pt-3">
          {warnings.map((w, i) => (
            <li key={i} className="text-xs text-orange-400">
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
