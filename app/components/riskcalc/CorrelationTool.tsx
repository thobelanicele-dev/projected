"use client";

import { useMemo, useState } from "react";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { PairInput } from "@/app/components/riskcalc/PairInput";
import { useRiskCalcShared } from "@/app/components/riskcalc/SharedInputsContext";
import { calculateCorrelationRisk, type CorrelationPosition } from "@/app/lib/riskCalculator";

interface Row {
  id: string;
  pair: string;
  direction: "long" | "short";
  lots: string;
  dollarRisk: string;
  stopLossPips: string;
}

let rowCounter = 0;
function makeRow(pair: string): Row {
  rowCounter += 1;
  return {
    id: `row-${rowCounter}`,
    pair,
    direction: "long",
    lots: "0.5",
    dollarRisk: "100",
    stopLossPips: "50",
  };
}

export function CorrelationTool() {
  const { shared } = useRiskCalcShared();
  const [rows, setRows] = useState<Row[]>(() => [makeRow("EUR/USD"), makeRow("GBP/USD")]);

  function updateRow(id: string, updates: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, makeRow("EUR/USD")]);
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const positions: CorrelationPosition[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        pair: r.pair,
        direction: r.direction,
        lots: parseFloat(r.lots),
        dollarRisk: parseFloat(r.dollarRisk),
        stopLossPips: parseFloat(r.stopLossPips),
      })),
    [rows]
  );

  const outcome = useMemo(() => {
    if (positions.length === 0) return null;
    return calculateCorrelationRisk(positions, shared.accountBalance);
  }, [positions, shared.accountBalance]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={row.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Position {i + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <PairInput label="Pair" value={row.pair} onChange={(v) => updateRow(row.id, { pair: v })} />
              <Field label="Direction">
                <select
                  value={row.direction}
                  onChange={(e) => updateRow(row.id, { direction: e.target.value as "long" | "short" })}
                  className={inputClass}
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </Field>
              <Field label="Lots">
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.lots}
                  onChange={(e) => updateRow(row.id, { lots: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Dollar risk">
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.dollarRisk}
                  onChange={(e) => updateRow(row.id, { dollarRisk: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Stop (pips)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.stopLossPips}
                  onChange={(e) => updateRow(row.id, { stopLossPips: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
      >
        + Add position
      </button>

      {outcome ? (
        outcome.ok ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Net exposure per currency</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {outcome.result.exposures.map((e) => (
                  <div key={e.currency}>
                    <p className="text-xs text-zinc-500">{e.currency}</p>
                    <p
                      className={`mt-0.5 text-lg font-medium ${
                        e.netLots > 0 ? "text-emerald-400" : e.netLots < 0 ? "text-red-400" : "text-zinc-50"
                      }`}
                    >
                      {e.netLots > 0 ? "+" : ""}
                      {e.netLots} lots
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
                Total portfolio risk:{" "}
                <span className="font-medium text-zinc-100">{outcome.result.totalRiskPercent}%</span> of
                account balance
              </p>
            </div>

            {outcome.result.correlatedGroups.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Correlated exposure</p>
                {outcome.result.correlatedGroups.map((g, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-300"
                  >
                    {g.positionIds.length} positions combine to net {g.direction === "long" ? "+" : "−"}
                    {Math.abs(g.combinedNetLots)} lots of {g.currency} exposure — combined risk contribution $
                    {g.combinedRisk}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            <ul className="space-y-1">
              {Object.entries(outcome.errors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </div>
        )
      ) : (
        <p className="text-xs text-zinc-500">Add at least one position to see exposure.</p>
      )}
    </div>
  );
}
