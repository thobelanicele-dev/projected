import { migrateUnscopedKey, userScopedKey } from "@/app/lib/userScopedStorage";

const BASE_STORAGE_KEY = "fxinsites.planChecklist";

type ChecklistState = Record<string, boolean>;
type StoredMap = Record<string, ChecklistState>;

function storageKey(userId: string): string {
  const key = userScopedKey(BASE_STORAGE_KEY, userId);
  migrateUnscopedKey(BASE_STORAGE_KEY, key);
  return key;
}

function loadMap(userId: string): StoredMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as StoredMap) : {};
  } catch {
    return {};
  }
}

function saveMap(map: StoredMap, userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {
    // localStorage can throw (quota, private browsing); losing a checklist tick isn't worth surfacing
  }
}

export function loadChecklist(entryId: string, userId: string): ChecklistState {
  return loadMap(userId)[entryId] ?? {};
}

export function toggleChecklistItem(
  entryId: string,
  itemId: string,
  checked: boolean,
  userId: string
): ChecklistState {
  const map = loadMap(userId);
  const next = { ...(map[entryId] ?? {}), [itemId]: checked };
  map[entryId] = next;
  saveMap(map, userId);
  return next;
}

export function clearChecklist(entryId: string, userId: string): void {
  const map = loadMap(userId);
  delete map[entryId];
  saveMap(map, userId);
}
