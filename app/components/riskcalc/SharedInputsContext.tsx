"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_SHARED_INPUTS,
  getStoredSharedInputs,
  setStoredSharedInputs,
  type AccountCurrency,
  type LotConvention,
  type RiskMode,
  type SharedInputs,
} from "@/app/lib/riskCalculator";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";

interface RiskCalcSharedContextValue {
  shared: SharedInputs;
  /** Flips true exactly once, after the initial localStorage read completes (found or not). */
  hydrated: boolean;
  setAccountBalance: (n: number) => void;
  setAccountCurrency: (c: AccountCurrency) => void;
  setRiskMode: (m: RiskMode) => void;
  setRiskValue: (n: number) => void;
  setLotConvention: (l: LotConvention) => void;
  lastPositionSizeUnits: number | null;
  setLastPositionSizeUnits: (n: number | null) => void;
  /** False while the shared inputs (balance, risk) hold something unusable, so results aren't shown from stale numbers. */
  inputsValid: boolean;
  setInputsValid: (valid: boolean) => void;
}

const RiskCalcSharedContext = createContext<RiskCalcSharedContextValue | null>(null);

export function RiskCalcSharedProvider({ children }: { children: React.ReactNode }) {
  const userId = useCurrentUserId();
  const [shared, setShared] = useState<SharedInputs>(DEFAULT_SHARED_INPUTS);
  const [hydrated, setHydrated] = useState(false);
  const [lastPositionSizeUnits, setLastPositionSizeUnits] = useState<number | null>(null);
  const [inputsValid, setInputsValid] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const stored = getStoredSharedInputs(userId);
      if (stored) setShared(stored);
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, [userId]);

  function update(partial: Partial<SharedInputs>) {
    setShared((prev) => {
      const next = { ...prev, ...partial };
      setStoredSharedInputs(next, userId);
      return next;
    });
  }

  const value: RiskCalcSharedContextValue = {
    shared,
    hydrated,
    setAccountBalance: (n) => update({ accountBalance: n }),
    setAccountCurrency: (c) => update({ accountCurrency: c }),
    setRiskMode: (m) => update({ riskMode: m }),
    setRiskValue: (n) => update({ riskValue: n }),
    setLotConvention: (l) => update({ lotConvention: l }),
    lastPositionSizeUnits,
    setLastPositionSizeUnits,
    inputsValid,
    setInputsValid,
  };

  return <RiskCalcSharedContext.Provider value={value}>{children}</RiskCalcSharedContext.Provider>;
}

export function useRiskCalcShared(): RiskCalcSharedContextValue {
  const ctx = useContext(RiskCalcSharedContext);
  if (!ctx) throw new Error("useRiskCalcShared must be used within RiskCalcSharedProvider");
  return ctx;
}

/** Whether the shared inputs are usable. True outside the risk calculator, where there are none. */
export function useSharedInputsValid(): boolean {
  const ctx = useContext(RiskCalcSharedContext);
  return ctx ? ctx.inputsValid : true;
}
