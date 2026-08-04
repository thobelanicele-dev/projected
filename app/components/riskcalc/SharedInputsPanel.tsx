"use client";

import { useEffect, useState } from "react";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { ACCOUNT_CURRENCIES, LOT_LABELS, type LotConvention } from "@/app/lib/riskCalculator";
import { useRiskCalcShared } from "@/app/components/riskcalc/SharedInputsContext";

const LOT_CONVENTIONS: LotConvention[] = ["standard", "mini", "micro", "nano"];

const toggleButtonClass = (active: boolean) =>
  `flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? "border-zinc-500 bg-zinc-800 text-zinc-50"
      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
  }`;

export function SharedInputsPanel() {
  const {
    shared,
    hydrated,
    setAccountBalance,
    setAccountCurrency,
    setRiskMode,
    setRiskValue,
    setLotConvention,
  } = useRiskCalcShared();

  const [balanceText, setBalanceText] = useState(String(shared.accountBalance));
  const [riskText, setRiskText] = useState(String(shared.riskValue));

  // Resync local text once the provider's async localStorage read lands — never again after
  // that, so it doesn't fight with the user mid-keystroke (e.g. typing a trailing ".").
  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      setBalanceText(String(shared.accountBalance));
      setRiskText(String(shared.riskValue));
    }, 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const balanceValue = parseFloat(balanceText);
  const balanceError = !balanceText.trim() || isNaN(balanceValue) || balanceValue <= 0;

  const riskValue = parseFloat(riskText);
  const riskError = !riskText.trim() || isNaN(riskValue) || riskValue <= 0;

  function handleBalanceChange(value: string) {
    setBalanceText(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) setAccountBalance(parsed);
  }

  function handleRiskChange(value: string) {
    setRiskText(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) setRiskValue(parsed);
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Shared inputs</p>
      <p className="mt-1 text-xs text-zinc-500">
        These apply across all five tools below — change one and every tab updates.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Account balance">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">{shared.accountCurrency}</span>
            <input
              type="text"
              inputMode="decimal"
              value={balanceText}
              onChange={(e) => handleBalanceChange(e.target.value)}
              className={inputClass}
            />
          </div>
          {balanceError && (
            <p className="mt-1 text-xs text-red-400">Account balance must be greater than zero.</p>
          )}
        </Field>

        <Field label="Account currency">
          <select
            value={shared.accountCurrency}
            onChange={(e) => setAccountCurrency(e.target.value as typeof shared.accountCurrency)}
            className={inputClass}
          >
            {ACCOUNT_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Risk per trade">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRiskMode("percent")}
              className={toggleButtonClass(shared.riskMode === "percent")}
            >
              % of balance
            </button>
            <button
              type="button"
              onClick={() => setRiskMode("fixed")}
              className={toggleButtonClass(shared.riskMode === "fixed")}
            >
              Fixed $
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {shared.riskMode === "fixed" && <span className="text-sm text-zinc-400">$</span>}
            <input
              type="text"
              inputMode="decimal"
              value={riskText}
              onChange={(e) => handleRiskChange(e.target.value)}
              className={`${inputClass} max-w-[140px]`}
            />
            {shared.riskMode === "percent" && <span className="text-sm text-zinc-400">%</span>}
          </div>
          {riskError && (
            <p className="mt-1 text-xs text-red-400">
              {shared.riskMode === "percent"
                ? "Risk % must be greater than zero."
                : "Risk amount must be greater than zero."}
            </p>
          )}
        </Field>

        <Field label="Lot size convention">
          <div className="grid grid-cols-2 gap-2">
            {LOT_CONVENTIONS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLotConvention(l)}
                className={toggleButtonClass(shared.lotConvention === l)}
              >
                {LOT_LABELS[l]}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}
