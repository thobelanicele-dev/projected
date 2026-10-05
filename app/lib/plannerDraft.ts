import type { TradeIdeaFields } from "@/app/components/TradeIdeaForm";
import { migrateUnscopedKey, userScopedKey } from "@/app/lib/userScopedStorage";

const BASE_STORAGE_KEY = "fxinsites.plannerDraft";
const VERSION = 2; // bumped when the wizard's step numbering changed (10 steps -> 6)
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks; an older draft isn't worth resurrecting

export interface PlannerDraft {
  fields: TradeIdeaFields;
  step: number;
  maxStepVisited: number;
  hadChartImage: boolean;
  savedAt: number;
  version: number;
}

function storageKey(userId: string): string {
  const key = userScopedKey(BASE_STORAGE_KEY, userId);
  migrateUnscopedKey(BASE_STORAGE_KEY, key);
  return key;
}

export function loadPlannerDraft(userId: string): PlannerDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerDraft;
    if (parsed.version !== VERSION) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePlannerDraft(draft: Omit<PlannerDraft, "savedAt" | "version">, userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const toSave: PlannerDraft = { ...draft, savedAt: Date.now(), version: VERSION };
    window.localStorage.setItem(storageKey(userId), JSON.stringify(toSave));
  } catch {
    // localStorage can throw (quota, private browsing); losing a draft save isn't worth surfacing
  }
}

export function clearPlannerDraft(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}
