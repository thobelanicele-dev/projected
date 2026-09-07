import type { TradePlan } from "@/app/api/plan/route";
import type { ResultStat } from "@/app/components/RiskCalcSummary";

function formatPrice(price: number | null): string {
  return price === null ? "—" : price.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

// Plain-text serialization of the full trade-plan report, for the "Download
// report" button — mirrors every section TradeCard's "Full report" tab shows,
// top to bottom, so the exported file matches what's on screen.
export function buildReportText(plan: TradePlan, positionSize?: ResultStat[]): string {
  const lines: string[] = [];

  lines.push(`TRADE PLAN — ${plan.instrument} (${plan.direction === "long" ? "Long" : "Short"})`);
  lines.push(`Generated ${new Date().toLocaleString()}`);
  lines.push("");
  lines.push(plan.summary);
  lines.push("");

  lines.push(`Entry: ${formatPrice(plan.entry.price)} (${plan.entry.type})`);
  lines.push(plan.entry.condition);
  lines.push(`Before you pull the trigger: ${plan.entry.confirmation}`);
  lines.push("");

  lines.push(`Stop loss: ${formatPrice(plan.stopLoss.price)}`);
  lines.push(plan.stopLoss.reasoning);
  lines.push(`If this is hit: ${plan.stopLoss.invalidation}`);
  lines.push("");

  lines.push("Take profit:");
  plan.takeProfits.forEach((tp, i) => {
    const label = plan.takeProfits.length > 1 ? `Target ${i + 1}` : "Target";
    lines.push(`  ${label}: ${formatPrice(tp.price)} — ${tp.reasoning}`);
  });
  lines.push("");

  if (plan.riskRewardRatio !== null) {
    lines.push(`Risk:Reward — 1:${plan.riskRewardRatio}`);
  }
  if (positionSize && positionSize.length > 0) {
    positionSize.forEach((s) => lines.push(`${s.label}: ${s.value}`));
  }
  lines.push("");

  if (plan.chartCheck) {
    lines.push("From your chart:");
    plan.chartCheck.warnings.forEach((w) => lines.push(`  Warning: ${w}`));
    plan.chartCheck.observations.forEach((o) => lines.push(`  - ${o}`));
    lines.push("");
  }

  const passedCount = plan.ruleChecks.filter((c) => c.passed).length;
  lines.push(`Rule-set check (${passedCount}/${plan.ruleChecks.length} passed):`);
  plan.ruleChecks.forEach((c) => {
    lines.push(`  [${c.passed ? "x" : " "}] ${c.rule}${c.note ? ` — ${c.note}` : ""}`);
  });
  lines.push("");

  if (plan.biasFlags.length > 0) {
    lines.push("Bias flags:");
    plan.biasFlags.forEach((f) => lines.push(`  [${f.severity}] ${f.flag} — ${f.note}`));
    lines.push("");
  }

  if (plan.keyRisks.length > 0) {
    lines.push("Key risks:");
    plan.keyRisks.forEach((r) => lines.push(`  - ${r}`));
    lines.push("");
  }

  if (plan.watchFor.length > 0) {
    lines.push("Watch for:");
    plan.watchFor.forEach((w) => lines.push(`  - ${w}`));
    lines.push("");
  }

  lines.push(
    "This is not financial advice — it structures your own idea and checks it against risk-management rules, not a prediction of what the market will do."
  );

  return lines.join("\n");
}
