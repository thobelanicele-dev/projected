import type { TradePlan } from "@/app/api/plan/route";

export type TradeStatus = "planned" | "open" | "closed";
export type TradeOutcome = "win" | "loss" | "breakeven";
export type EntrySource = "planner" | "imported";

export interface JournalEntry {
  id: string;
  createdAt: number;
  source: EntrySource;
  instrument: string;
  direction: "long" | "short";
  ideaText?: string;
  plan?: TradePlan;
  stopLossPrice?: number;
  status: TradeStatus;
  outcome?: TradeOutcome;
  actualEntryPrice?: number;
  actualExitPrice?: number;
  rMultiple?: number;
  profitAmount?: number;
  notes?: string;
  closedAt?: number;
}

export interface JournalStats {
  totalTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number | null;
  avgR: number | null;
  ruleAdherenceRate: number | null;
  ruleAdherenceSampleSize: number;
  totalProfitAmount: number | null;
  equityCurve: { id: string; cumulativeR: number }[];
}

const STORAGE_KEY = "fxinsites.journal";
const MAX_ENTRIES = 200;

function normalizeEntry(e: JournalEntry): JournalEntry {
  if (e.instrument && e.direction && e.source) return e;
  return {
    ...e,
    instrument: e.instrument ?? e.plan?.instrument ?? "Unknown",
    direction: e.direction ?? e.plan?.direction ?? "long",
    source: e.source ?? (e.plan ? "planner" : "imported"),
  };
}

export function loadJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as JournalEntry[]) : [];
    return parsed.map(normalizeEntry);
  } catch {
    return [];
  }
}

function persist(entries: JournalEntry[]): JournalEntry[] {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  return entries;
}

export function addPlanToJournal(ideaText: string, plan: TradePlan): JournalEntry[] {
  const entry: JournalEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    source: "planner",
    instrument: plan.instrument,
    direction: plan.direction,
    ideaText,
    plan,
    status: "planned",
  };
  return persist([entry, ...loadJournal()].slice(0, MAX_ENTRIES));
}

export function addImportedEntries(newEntries: JournalEntry[]): JournalEntry[] {
  return persist([...newEntries, ...loadJournal()].slice(0, MAX_ENTRIES));
}

export function updateJournalEntry(
  id: string,
  updates: Partial<Omit<JournalEntry, "id" | "createdAt" | "ideaText" | "plan">>
): JournalEntry[] {
  const entries = loadJournal().map((e) => (e.id === id ? { ...e, ...updates } : e));
  return persist(entries);
}

export function deleteJournalEntry(id: string): JournalEntry[] {
  return persist(loadJournal().filter((e) => e.id !== id));
}

export function clearJournal(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function suggestRMultiple(entry: JournalEntry): number | null {
  const { plan, actualEntryPrice, actualExitPrice, stopLossPrice, direction } = entry;
  const entryPrice = actualEntryPrice ?? plan?.entry.price ?? null;
  const stopPrice = plan?.stopLoss.price ?? stopLossPrice ?? null;

  if (entryPrice === null || stopPrice === null || actualExitPrice === undefined) return null;

  const riskPerUnit = Math.abs(entryPrice - stopPrice);
  if (riskPerUnit === 0) return null;

  const rewardPerUnit =
    direction === "long" ? actualExitPrice - entryPrice : entryPrice - actualExitPrice;

  return Math.round((rewardPerUnit / riskPerUnit) * 100) / 100;
}

export function computeStats(entries: JournalEntry[]): JournalStats {
  const closed = entries.filter((e) => e.status === "closed");
  const wins = closed.filter((e) => e.outcome === "win").length;
  const losses = closed.filter((e) => e.outcome === "loss").length;
  const breakevens = closed.filter((e) => e.outcome === "breakeven").length;

  const rValues = closed
    .map((e) => e.rMultiple)
    .filter((r): r is number => typeof r === "number");

  const withRuleChecks = entries.filter((e) => e.plan && e.plan.ruleChecks.length > 0);
  const fullyCompliant = withRuleChecks.filter((e) => e.plan!.ruleChecks.every((c) => c.passed));

  const profitValues = closed
    .map((e) => e.profitAmount)
    .filter((p): p is number => typeof p === "number");

  let cumulative = 0;
  const equityCurve = [...closed]
    .sort((a, b) => (a.closedAt ?? 0) - (b.closedAt ?? 0))
    .map((e) => {
      cumulative += e.rMultiple ?? 0;
      return { id: e.id, cumulativeR: Math.round(cumulative * 100) / 100 };
    });

  return {
    totalTrades: entries.length,
    closedTrades: closed.length,
    wins,
    losses,
    breakevens,
    winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
    avgR: rValues.length > 0 ? Math.round((rValues.reduce((a, b) => a + b, 0) / rValues.length) * 100) / 100 : null,
    ruleAdherenceRate:
      withRuleChecks.length > 0
        ? Math.round((fullyCompliant.length / withRuleChecks.length) * 100)
        : null,
    ruleAdherenceSampleSize: withRuleChecks.length,
    totalProfitAmount:
      profitValues.length > 0
        ? Math.round(profitValues.reduce((a, b) => a + b, 0) * 100) / 100
        : null,
    equityCurve,
  };
}
