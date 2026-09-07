"use client";

import { useState } from "react";
import type { TradePlan } from "@/app/api/plan/route";
import { RiskCalcSummary, type ResultStat } from "@/app/components/RiskCalcSummary";
import { TradeLadder } from "@/app/components/TradeLadder";
import { ChartOverlay } from "@/app/components/ChartOverlay";
import { TradeChecklist } from "@/app/components/TradeChecklist";
import { buildReportText } from "@/app/lib/reportExport";

function formatPrice(price: number | null) {
  return price === null ? "—" : price.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

const severityStyles: Record<TradePlan["biasFlags"][number]["severity"], string> = {
  low: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  medium: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  high: "border-red-500/40 bg-red-500/10 text-red-300",
};

const detailsSummaryClass =
  "cursor-pointer select-none text-xs text-sky-400 marker:content-none [&::-webkit-details-marker]:hidden";

const tabButtonClass = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
    active ? "bg-zinc-50 text-black" : "text-zinc-400 hover:text-zinc-200"
  }`;

export function TradeCard({
  plan,
  positionSize,
  chartImageUrl,
  journalEntryId,
}: {
  plan: TradePlan;
  positionSize?: ResultStat[];
  chartImageUrl?: string | null;
  journalEntryId?: string | null;
}) {
  const [view, setView] = useState<"overview" | "report">("overview");

  const passedCount = plan.ruleChecks.filter((c) => c.passed).length;
  const totalChecks = plan.ruleChecks.length;

  const takeProfitLabels = plan.takeProfits.map((_, i) =>
    plan.takeProfits.length > 1 ? `Target ${i + 1}` : "Target"
  );

  const headlineStats: ResultStat[] = [
    { label: "Entry", value: formatPrice(plan.entry.price) },
    { label: "Stop loss", value: formatPrice(plan.stopLoss.price) },
    ...plan.takeProfits.map((tp, i) => ({ label: takeProfitLabels[i], value: formatPrice(tp.price) })),
    ...(plan.riskRewardRatio !== null
      ? [{ label: "Risk:Reward", value: `1:${plan.riskRewardRatio}` }]
      : []),
    ...(positionSize ?? []),
  ];

  function downloadReport() {
    const text = buildReportText(plan, positionSize);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.instrument.replace(/\W+/g, "-")}-trade-plan.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chartLevels = plan.chartCheck?.levels;
  const hasOverlay = !!chartImageUrl && !!chartLevels;

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

      <div className="no-print mt-4 flex gap-1.5">
        <button type="button" onClick={() => setView("overview")} className={tabButtonClass(view === "overview")}>
          Overview
        </button>
        <button type="button" onClick={() => setView("report")} className={tabButtonClass(view === "report")}>
          Full report
        </button>
      </div>

      {/* Overview: the diagram, chart overlay, and checklist — the "tool", not the document */}
      <div className={view === "overview" ? "mt-5 flex flex-col gap-5" : "hidden"}>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-base leading-relaxed text-zinc-100">
          {plan.summary}
        </div>

        <RiskCalcSummary stats={headlineStats} />

        <TradeLadder plan={plan} />

        {hasOverlay && chartImageUrl && chartLevels && (
          <ChartOverlay imageUrl={chartImageUrl} levels={chartLevels} takeProfitLabels={takeProfitLabels} />
        )}

        {journalEntryId && <TradeChecklist key={journalEntryId} plan={plan} journalEntryId={journalEntryId} />}
      </div>

      {/* Full report: the complete original card, unchanged, always available and exportable */}
      <div className={`print-report ${view === "report" ? "mt-5" : "hidden"}`}>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-base leading-relaxed text-zinc-100">
          {plan.summary}
        </div>

        <div className="mt-5">
          <RiskCalcSummary stats={headlineStats} />
        </div>

        {plan.chartCheck && (
          <div className="mt-5 border-t border-zinc-800 pt-5">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">From your chart</p>
            {plan.chartCheck.warnings.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {plan.chartCheck.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-300">
                    <span className="text-orange-400">⚠</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            )}
            <ul className="space-y-1.5">
              {plan.chartCheck.observations.map((observation, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-sky-400">•</span>
                  <span>{observation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-5 py-5">
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Entry</p>
              <p className="text-lg font-medium">{formatPrice(plan.entry.price)}</p>
              <span className="text-xs text-zinc-500">({plan.entry.type})</span>
            </div>
            <details className="group mt-1.5">
              <summary className={detailsSummaryClass}>Why this level?</summary>
              <p className="mt-1.5 text-sm text-zinc-400">{plan.entry.condition}</p>
              <p className="mt-1.5 text-sm text-zinc-500">
                <span className="text-zinc-400">Before you pull the trigger:</span> {plan.entry.confirmation}
              </p>
            </details>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Stop loss</p>
              <p className="text-lg font-medium text-red-400">{formatPrice(plan.stopLoss.price)}</p>
            </div>
            <details className="group mt-1.5">
              <summary className={detailsSummaryClass}>Why this level?</summary>
              <p className="mt-1.5 text-sm text-zinc-400">{plan.stopLoss.reasoning}</p>
              <p className="mt-1.5 text-sm text-zinc-500">
                <span className="text-zinc-400">If this is hit:</span> {plan.stopLoss.invalidation}
              </p>
            </details>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Take profit</p>
            <div className="mt-1 space-y-3">
              {plan.takeProfits.map((tp, i) => (
                <div key={i}>
                  <p className="text-lg font-medium text-emerald-400">{formatPrice(tp.price)}</p>
                  <details className="group mt-1">
                    <summary className={detailsSummaryClass}>Why this level?</summary>
                    <p className="mt-1.5 text-sm text-zinc-400">{tp.reasoning}</p>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-5">
          <details className="group">
            <summary className="flex cursor-pointer select-none items-center justify-between marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Rule-set check</span>
              <span
                className={`text-sm font-medium ${
                  passedCount === totalChecks ? "text-emerald-400" : "text-orange-400"
                }`}
              >
                {passedCount}/{totalChecks} passed
              </span>
            </summary>
            <ul className="mt-3 space-y-1.5">
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
          </details>
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

        <div className="no-print mt-5 flex gap-3 border-t border-zinc-800 pt-5">
          <button
            type="button"
            onClick={downloadReport}
            className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500"
          >
            Download report (.txt)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
