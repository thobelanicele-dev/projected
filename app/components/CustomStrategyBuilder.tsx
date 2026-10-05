"use client";

import { useState } from "react";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import type { ComparisonOperator, Condition, CustomStrategy, Indicator } from "@/app/lib/backtestEngine";
import {
  deleteCustomStrategy,
  loadCustomStrategies,
  saveCustomStrategy,
} from "@/app/lib/customStrategies";
import { useCurrentUserId } from "@/app/components/CurrentUserProvider";

type IndicatorKind = Indicator["kind"];

const INDICATOR_LABELS: Record<IndicatorKind, string> = {
  price: "Price",
  sma: "Simple moving average",
  ema: "Exponential moving average",
  rsi: "RSI",
  bollinger_upper: "Bollinger upper band",
  bollinger_lower: "Bollinger lower band",
  macd_line: "MACD line",
  macd_signal: "MACD signal line",
  highest_high: "Highest high (N bars back)",
  lowest_low: "Lowest low (N bars back)",
  constant: "Fixed number",
};

const OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  crosses_above: "crosses above",
  crosses_below: "crosses below",
  greater_than: "is greater than",
  less_than: "is less than",
};

function defaultIndicatorFor(kind: IndicatorKind): Indicator {
  switch (kind) {
    case "price":
      return { kind: "price" };
    case "sma":
      return { kind: "sma", period: 20 };
    case "ema":
      return { kind: "ema", period: 20 };
    case "rsi":
      return { kind: "rsi", period: 14 };
    case "bollinger_upper":
      return { kind: "bollinger_upper", period: 20, stdDevMultiplier: 2 };
    case "bollinger_lower":
      return { kind: "bollinger_lower", period: 20, stdDevMultiplier: 2 };
    case "macd_line":
      return { kind: "macd_line", fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
    case "macd_signal":
      return { kind: "macd_signal", fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
    case "highest_high":
      return { kind: "highest_high", lookback: 20 };
    case "lowest_low":
      return { kind: "lowest_low", lookback: 20 };
    case "constant":
      return { kind: "constant", value: 0 };
  }
}

function defaultCondition(): Condition {
  return { left: { kind: "price" }, operator: "crosses_above", right: { kind: "sma", period: 20 } };
}

export function emptyCustomStrategy(): CustomStrategy {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    longConditions: [defaultCondition()],
    shortConditions: [],
    createdAt: Date.now(),
  };
}

function IndicatorEditor({
  value,
  onChange,
}: {
  value: Indicator;
  onChange: (next: Indicator) => void;
}) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <select
        value={value.kind}
        onChange={(e) => onChange(defaultIndicatorFor(e.target.value as IndicatorKind))}
        className={`${inputClass} max-w-[230px]`}
      >
        {(Object.keys(INDICATOR_LABELS) as IndicatorKind[]).map((k) => (
          <option key={k} value={k}>
            {INDICATOR_LABELS[k]}
          </option>
        ))}
      </select>

      {value.kind === "sma" || value.kind === "ema" || value.kind === "rsi" ? (
        <input
          type="number"
          min={1}
          value={value.period}
          onChange={(e) => onChange({ ...value, period: parseInt(e.target.value, 10) || 1 })}
          className={`${inputClass} max-w-[90px]`}
          aria-label="Period"
        />
      ) : null}

      {value.kind === "bollinger_upper" || value.kind === "bollinger_lower" ? (
        <>
          <input
            type="number"
            min={1}
            value={value.period}
            onChange={(e) => onChange({ ...value, period: parseInt(e.target.value, 10) || 1 })}
            className={`${inputClass} max-w-[90px]`}
            aria-label="Period"
          />
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={value.stdDevMultiplier}
            onChange={(e) => onChange({ ...value, stdDevMultiplier: parseFloat(e.target.value) || 0.1 })}
            className={`${inputClass} max-w-[90px]`}
            aria-label="Std dev multiplier"
          />
        </>
      ) : null}

      {value.kind === "macd_line" || value.kind === "macd_signal" ? (
        <>
          <input
            type="number"
            min={1}
            value={value.fastPeriod}
            onChange={(e) => onChange({ ...value, fastPeriod: parseInt(e.target.value, 10) || 1 })}
            className={`${inputClass} max-w-[80px]`}
            aria-label="Fast period"
          />
          <input
            type="number"
            min={1}
            value={value.slowPeriod}
            onChange={(e) => onChange({ ...value, slowPeriod: parseInt(e.target.value, 10) || 1 })}
            className={`${inputClass} max-w-[80px]`}
            aria-label="Slow period"
          />
          <input
            type="number"
            min={1}
            value={value.signalPeriod}
            onChange={(e) => onChange({ ...value, signalPeriod: parseInt(e.target.value, 10) || 1 })}
            className={`${inputClass} max-w-[80px]`}
            aria-label="Signal period"
          />
        </>
      ) : null}

      {value.kind === "highest_high" || value.kind === "lowest_low" ? (
        <input
          type="number"
          min={1}
          value={value.lookback}
          onChange={(e) => onChange({ ...value, lookback: parseInt(e.target.value, 10) || 1 })}
          className={`${inputClass} max-w-[90px]`}
          aria-label="Lookback bars"
        />
      ) : null}

      {value.kind === "constant" ? (
        <input
          type="number"
          step="any"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: parseFloat(e.target.value) || 0 })}
          className={`${inputClass} max-w-[110px]`}
          aria-label="Value"
        />
      ) : null}
    </div>
  );
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (next: Condition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:flex-row sm:items-center">
      <IndicatorEditor value={condition.left} onChange={(left) => onChange({ ...condition, left })} />
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as ComparisonOperator })}
        className={`${inputClass} max-w-[160px]`}
      >
        {(Object.keys(OPERATOR_LABELS) as ComparisonOperator[]).map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>
      <IndicatorEditor value={condition.right} onChange={(right) => onChange({ ...condition, right })} />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 self-start text-xs text-red-400 hover:text-red-300 sm:self-center"
      >
        Remove
      </button>
    </div>
  );
}

function ConditionList({
  title,
  conditions,
  onChange,
}: {
  title: string;
  conditions: Condition[];
  onChange: (next: Condition[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <button
          type="button"
          onClick={() => onChange([...conditions, defaultCondition()])}
          className="text-xs text-sky-400 hover:text-sky-300"
        >
          + Add condition
        </button>
      </div>
      {conditions.length === 0 && (
        <p className="mt-2 text-xs text-zinc-500">No conditions set — this side will never trigger.</p>
      )}
      <div className="mt-2 flex flex-col gap-2">
        {conditions.map((cond, i) => (
          <ConditionRow
            key={i}
            condition={cond}
            onChange={(next) => onChange(conditions.map((c, j) => (j === i ? next : c)))}
            onRemove={() => onChange(conditions.filter((_, j) => j !== i))}
          />
        ))}
      </div>
      {conditions.length > 1 && (
        <p className="mt-1.5 text-xs text-zinc-500">All of the above must be true on the same bar.</p>
      )}
    </div>
  );
}

export function CustomStrategyBuilder({
  value,
  onChange,
}: {
  value: CustomStrategy;
  onChange: (next: CustomStrategy) => void;
}) {
  const userId = useCurrentUserId();
  const [saved, setSaved] = useState(() => loadCustomStrategies(userId));
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleSave() {
    if (!value.name.trim()) {
      setSaveError("Give this strategy a name before saving.");
      return;
    }
    if (value.longConditions.length === 0 && value.shortConditions.length === 0) {
      setSaveError("Add at least one condition before saving.");
      return;
    }
    setSaveError(null);
    setSaved(saveCustomStrategy(value, userId));
  }

  function handleLoad(id: string) {
    const strategy = saved.find((s) => s.id === id);
    if (strategy) onChange(strategy);
  }

  function handleDelete(id: string) {
    setSaved(deleteCustomStrategy(id, userId));
  }

  function handleStartNew() {
    onChange(emptyCustomStrategy());
    setSaveError(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {saved.length > 0 && (
        <Field label="Load a saved strategy" hint="Loading one replaces what's below.">
          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleLoad(e.target.value);
                e.target.value = "";
              }}
              className={`${inputClass} max-w-[260px]`}
            >
              <option value="" disabled>
                Choose a saved strategy…
              </option>
              {saved.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleDelete(value.id)}
              disabled={!saved.some((s) => s.id === value.id)}
              className="text-xs text-red-400 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Delete loaded strategy
            </button>
            <button type="button" onClick={handleStartNew} className="text-xs text-zinc-400 hover:text-zinc-200">
              Start a new one
            </button>
          </div>
        </Field>
      )}

      <Field label="Strategy name">
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="e.g. My RSI + trend filter"
          className={inputClass}
        />
      </Field>

      <ConditionList
        title="Go long when…"
        conditions={value.longConditions}
        onChange={(longConditions) => onChange({ ...value, longConditions })}
      />
      <ConditionList
        title="Go short when…"
        conditions={value.shortConditions}
        onChange={(shortConditions) => onChange({ ...value, shortConditions })}
      />

      <div>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
        >
          Save this strategy
        </button>
        {saveError && <p className="mt-2 text-xs text-orange-400">{saveError}</p>}
      </div>
    </div>
  );
}
