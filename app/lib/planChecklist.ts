const STORAGE_KEY = "fxinsites.planChecklist";

type ChecklistState = Record<string, boolean>;
type StoredMap = Record<string, ChecklistState>;

function loadMap(): StoredMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredMap) : {};
  } catch {
    return {};
  }
}

function saveMap(map: StoredMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage can throw (quota, private browsing) — losing a checklist tick isn't worth surfacing
  }
}

export function loadChecklist(entryId: string): ChecklistState {
  return loadMap()[entryId] ?? {};
}

export function toggleChecklistItem(entryId: string, itemId: string, checked: boolean): ChecklistState {
  const map = loadMap();
  const next = { ...(map[entryId] ?? {}), [itemId]: checked };
  map[entryId] = next;
  saveMap(map);
  return next;
}

export function clearChecklist(entryId: string): void {
  const map = loadMap();
  delete map[entryId];
  saveMap(map);
}
