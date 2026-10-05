"use client";

import { createContext, useContext } from "react";

const CurrentUserContext = createContext<string | null>(null);

export function CurrentUserProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={userId}>{children}</CurrentUserContext.Provider>;
}

/** The signed-in user's id, used to scope client-side-only storage (journal, drafts, etc.) per account. */
export function useCurrentUserId(): string {
  const id = useContext(CurrentUserContext);
  if (!id) throw new Error("useCurrentUserId must be used within CurrentUserProvider");
  return id;
}
