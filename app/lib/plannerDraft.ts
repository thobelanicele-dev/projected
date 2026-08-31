import type { TradeIdeaFields } from "@/app/components/TradeIdeaForm";

const STORAGE_KEY = "fxinsites.plannerDraft";
const VERSION = 1;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks — an older draft isn't worth resurrecting

export interface PlannerDraft {
  fields: TradeIdeaFields;
  step: number;
  maxStepVisited: number;
  hadChartImage: boolean;
  savedAt: number;
  version: number;
}

export function loadPlannerDraft(): PlannerDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerDraft;
    if (parsed.version !== VERSION) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlannerDraft(draft: Omit<PlannerDraft, "savedAt" | "version">): void {
  if (typeof window === "undefined") return;
  try {
    const toSave: PlannerDraft = { ...draft, savedAt: Date.now(), version: VERSION };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage can throw (quota, private browsing) — losing a draft save isn't worth surfacing
  }
}

export function clearPlannerDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
