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
}

const RiskCalcSharedContext = createContext<RiskCalcSharedContextValue | null>(null);

export function RiskCalcSharedProvider({ children }: { children: React.ReactNode }) {
  const [shared, setShared] = useState<SharedInputs>(DEFAULT_SHARED_INPUTS);
  const [hydrated, setHydrated] = useState(false);
  const [lastPositionSizeUnits, setLastPositionSizeUnits] = useState<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const stored = getStoredSharedInputs();
      if (stored) setShared(stored);
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function update(partial: Partial<SharedInputs>) {
    setShared((prev) => {
      const next = { ...prev, ...partial };
      setStoredSharedInputs(next);
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
  };

  return <RiskCalcSharedContext.Provider value={value}>{children}</RiskCalcSharedContext.Provider>;
}

export function useRiskCalcShared(): RiskCalcSharedContextValue {
  const ctx = useContext(RiskCalcSharedContext);
  if (!ctx) throw new Error("useRiskCalcShared must be used within RiskCalcSharedProvider");
  return ctx;
}
