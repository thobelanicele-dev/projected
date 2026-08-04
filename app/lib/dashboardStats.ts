import type { JournalEntry } from "@/app/lib/journal";

export interface TradeComparison {
  id: string;
  instrument: string;
  direction: "long" | "short";
  closedAt: number | null;
  plannedR: number;
  actualR: number;
  errorR: number;
  metOrBeatPlan: boolean;
  plannedEntry: number | null;
  actualEntry: number | null;
  entryDeviationPct: number | null;
}

export interface AccuracyStats {
  comparableCount: number;
  avgErrorR: number | null;
  avgAbsErrorR: number | null;
  metOrBeatPlanRate: number | null;
  avgEntryDeviationPct: number | null;
  comparisons: TradeComparison[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function entryDeviationPct(entry: JournalEntry): number | null {
  const plannedEntry = entry.plan?.entry.price;
  const plannedStop = entry.plan?.stopLoss.price;
  const actualEntry = entry.actualEntryPrice;

  if (
    typeof plannedEntry !== "number" ||
    typeof plannedStop !== "number" ||
    typeof actualEntry !== "number"
  ) {
    return null;
  }

  const riskDistance = Math.abs(plannedEntry - plannedStop);
  if (riskDistance === 0) return null;

  return round2((Math.abs(actualEntry - plannedEntry) / riskDistance) * 100);
}

export function computeAccuracyStats(entries: JournalEntry[]): AccuracyStats {
  const comparisons: TradeComparison[] = entries
    .filter(
      (e): e is JournalEntry & { rMultiple: number; plan: NonNullable<JournalEntry["plan"]> } =>
        e.status === "closed" &&
        !!e.plan &&
        typeof e.plan.riskRewardRatio === "number" &&
        typeof e.rMultiple === "number"
    )
    .map((e) => {
      const plannedR = e.plan.riskRewardRatio as number;
      const actualR = e.rMultiple;
      return {
        id: e.id,
        instrument: e.instrument,
        direction: e.direction,
        closedAt: e.closedAt ?? null,
        plannedR,
        actualR,
        errorR: round2(actualR - plannedR),
        metOrBeatPlan: actualR >= plannedR,
        plannedEntry: e.plan.entry.price,
        actualEntry: e.actualEntryPrice ?? null,
        entryDeviationPct: entryDeviationPct(e),
      };
    })
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0));

  const errors = comparisons.map((c) => c.errorR);
  const deviations = comparisons
    .map((c) => c.entryDeviationPct)
    .filter((d): d is number => d !== null);

  return {
    comparableCount: comparisons.length,
    avgErrorR:
      errors.length > 0 ? round2(errors.reduce((a, b) => a + b, 0) / errors.length) : null,
    avgAbsErrorR:
      errors.length > 0
        ? round2(errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length)
        : null,
    metOrBeatPlanRate:
      comparisons.length > 0
        ? Math.round(
            (comparisons.filter((c) => c.metOrBeatPlan).length / comparisons.length) * 100
          )
        : null,
    avgEntryDeviationPct:
      deviations.length > 0
        ? round2(deviations.reduce((a, b) => a + b, 0) / deviations.length)
        : null,
    comparisons,
  };
}
