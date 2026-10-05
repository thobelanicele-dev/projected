import type { CustomStrategy } from "@/app/lib/backtestEngine";
import { userScopedKey } from "@/app/lib/userScopedStorage";

// New feature, so there's no pre-existing unscoped key to migrate from —
// every saved strategy is scoped to its account from day one.
const BASE_STORAGE_KEY = "fxinsites.customStrategies";

function storageKey(userId: string): string {
  return userScopedKey(BASE_STORAGE_KEY, userId);
}

export function loadCustomStrategies(userId: string): CustomStrategy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as CustomStrategy[]) : [];
  } catch {
    return [];
  }
}

function persist(strategies: CustomStrategy[], userId: string): CustomStrategy[] {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(strategies));
  }
  return strategies;
}

export function saveCustomStrategy(strategy: CustomStrategy, userId: string): CustomStrategy[] {
  const existing = loadCustomStrategies(userId);
  const next = [strategy, ...existing.filter((s) => s.id !== strategy.id)];
  return persist(next, userId);
}

export function deleteCustomStrategy(id: string, userId: string): CustomStrategy[] {
  return persist(loadCustomStrategies(userId).filter((s) => s.id !== id), userId);
}
