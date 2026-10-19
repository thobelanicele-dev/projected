"use client";

import { createContext, useContext } from "react";
import type { PlanTier } from "@/app/lib/planLimits";

const CurrentUserContext = createContext<string | null>(null);
const CurrentTierContext = createContext<PlanTier>("free");

export function CurrentUserProvider({
  userId,
  tier = "free",
  children,
}: {
  userId: string;
  tier?: PlanTier;
  children: React.ReactNode;
}) {
  return (
    <CurrentUserContext.Provider value={userId}>
      <CurrentTierContext.Provider value={tier}>{children}</CurrentTierContext.Provider>
    </CurrentUserContext.Provider>
  );
}

/** The signed-in user's id, used to scope client-side-only storage (journal, drafts, etc.) per account. */
export function useCurrentUserId(): string {
  const id = useContext(CurrentUserContext);
  if (!id) throw new Error("useCurrentUserId must be used within CurrentUserProvider");
  return id;
}

/** The plan the signed-in user is on right now, used to apply the browser-side limits. */
export function useCurrentTier(): PlanTier {
  return useContext(CurrentTierContext);
}
