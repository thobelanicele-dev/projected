import { migrateUnscopedKey, userScopedKey } from "@/app/lib/userScopedStorage";

const BASE_STORAGE_KEY = "fxinsites.backtestSeed";
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes; this is a one-shot handoff, not a real draft

export interface BacktestSeed {
  pair: string;
  description: string;
  stopLossPct: number | null;
  takeProfitPct: number | null;
}

interface StoredSeed extends BacktestSeed {
  savedAt: number;
}

function storageKey(userId: string): string {
  const key = userScopedKey(BASE_STORAGE_KEY, userId);
  migrateUnscopedKey(BASE_STORAGE_KEY, key);
  return key;
}

// One-shot handoff from a generated trade plan to the backtester: the planner
// writes this right before navigating to /backtest, and the backtest page
// reads and clears it once on mount. Not a real draft, so no version field —
// if the shape ever changes, a mismatched old value just fails silently below.
export function writeBacktestSeed(seed: BacktestSeed, userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const toSave: StoredSeed = { ...seed, savedAt: Date.now() };
    window.localStorage.setItem(storageKey(userId), JSON.stringify(toSave));
  } catch {
    // localStorage can throw (quota, private browsing); losing the handoff isn't worth surfacing
  }
}

export function readAndClearBacktestSeed(userId: string): BacktestSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const key = storageKey(userId);
    const raw = window.localStorage.getItem(key);
    window.localStorage.removeItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSeed;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return { pair: parsed.pair, description: parsed.description, stopLossPct: parsed.stopLossPct, takeProfitPct: parsed.takeProfitPct };
  } catch {
    return null;
  }
}
