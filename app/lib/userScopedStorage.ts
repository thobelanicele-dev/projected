// Every client-side-only store (journal, planner drafts, shared risk-calc
// inputs) used to live under one flat localStorage key, shared by anyone
// signed into that browser. That meant switching accounts on the same
// device let one account see another's saved trades: a real cross-account
// data leak, found by actually signing into a second account mid-beta.
//
// Fix: every key is now suffixed with the current user's id. The one-time
// migration below lets whichever account happens to load first after this
// change "claim" the old unscoped data as its own (since there's no way to
// know who it really belonged to), then clears the old key so no other
// account can see it afterward.
export function userScopedKey(base: string, userId: string): string {
  return `${base}.${userId}`;
}

export function migrateUnscopedKey(baseKey: string, scopedKey: string): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(scopedKey) !== null) return;
    const unscoped = window.localStorage.getItem(baseKey);
    if (unscoped === null) return;
    window.localStorage.setItem(scopedKey, unscoped);
    window.localStorage.removeItem(baseKey);
  } catch {
    // ignore; worst case the old shared data just stays put
  }
}
