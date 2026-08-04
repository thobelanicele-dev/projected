"use client";

import { useState } from "react";
import { POPULAR_PAIRS } from "@/app/components/TradeIdeaForm";
import { parseCandleCsv } from "@/app/lib/parseCandles";
import type { Candle, ExitRules, StrategyParams } from "@/app/lib/backtestEngine";

type StrategyType = StrategyParams["type"];

const DEFAULT_PARAMS: Record<StrategyType, StrategyParams> = {
  ma_crossover: { type: "ma_crossover", fastPeriod: 10, slowPeriod: 30, maKind: "sma" },
  breakout: { type: "breakout", lookbackDays: 20 },
  rsi: { type: "rsi", period: 14, oversold: 30, overbought: 70 },
};

const STRATEGY_LABELS: Record<StrategyType, string> = {
  ma_crossover: "Moving average crossover",
  breakout: "N-day breakout",
  rsi: "RSI oversold / overbought",
};

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function BacktestForm({
  onRun,
  loading,
}: {
  onRun: (candles: Candle[], strategy: StrategyParams, exitRules: ExitRules) => void;
  loading: boolean;
}) {
  const [pair, setPair] = useState("EUR/USD");
  const [dataSource, setDataSource] = useState<"market" | "csv">("market");
  const [lookbackDays, setLookbackDays] = useState("365");
  const [marketCandles, setMarketCandles] = useState<Candle[] | null>(null);
  const [marketStatus, setMarketStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [marketError, setMarketError] = useState<string | null>(null);

  const [csvCandles, setCsvCandles] = useState<Candle[] | null>(null);
  const [csvSkipped, setCsvSkipped] = useState(0);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [ruleMode, setRuleMode] = useState<"template" | "freetext">("template");
  const [strategyType, setStrategyType] = useState<StrategyType>("ma_crossover");
  const [params, setParams] = useState<Record<StrategyType, StrategyParams>>(DEFAULT_PARAMS);
  const [stopLossPct, setStopLossPct] = useState("2");
  const [takeProfitPct, setTakeProfitPct] = useState("6");
  const [costPct, setCostPct] = useState("0.05");

  const [freeText, setFreeText] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [interpretError, setInterpretError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const candles = dataSource === "market" ? marketCandles : csvCandles;

  function updateParam<K extends StrategyType>(type: K, updates: Partial<Extract<StrategyParams, { type: K }>>) {
    setParams((prev) => ({ ...prev, [type]: { ...prev[type], ...updates } }));
  }

  function handleLoadMarketData() {
    setMarketStatus("loading");
    setMarketError(null);
    fetch(`/api/candles?symbol=${encodeURIComponent(pair)}&days=${lookbackDays}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.candles) && data.candles.length > 0) {
          setMarketCandles(data.candles);
          setMarketStatus("ready");
        } else {
          setMarketError(data.error ?? "No data returned for this symbol.");
          setMarketStatus("error");
        }
      })
      .catch(() => {
        setMarketError("Couldn't reach the server.");
        setMarketStatus("error");
      });
  }

  function handleCsvSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCsvError(null);
    file
      .text()
      .then((text) => {
        const result = parseCandleCsv(text);
        if (result.candles.length === 0) {
          setCsvError(
            "Couldn't find usable price bars in that file. Expected columns like date/open/high/low/close."
          );
          return;
        }
        setCsvCandles(result.candles);
        setCsvSkipped(result.skippedCount);
      })
      .catch(() => setCsvError("Couldn't read that file."));
  }

  function handleInterpret() {
    if (!freeText.trim() || interpreting) return;
    setInterpreting(true);
    setInterpretError(null);
    fetch("/api/backtest/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: freeText }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setInterpretError(data.error);
          return;
        }
        setStrategyType(data.strategy.type);
        setParams((prev) => ({ ...prev, [data.strategy.type]: data.strategy }));
        setStopLossPct(String(data.stopLossPct));
        setTakeProfitPct(String(data.takeProfitPct));
        setExplanation(data.explanation);
      })
      .catch(() => setInterpretError("Couldn't reach the server."))
      .finally(() => setInterpreting(false));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candles || loading) return;
    const sl = parseFloat(stopLossPct);
    const tp = parseFloat(takeProfitPct);
    if (isNaN(sl) || isNaN(tp) || sl <= 0 || tp <= 0) return;
    const cost = parseFloat(costPct);
    onRun(candles, params[strategyType], {
      stopLossPct: sl,
      takeProfitPct: tp,
      costPct: isNaN(cost) ? 0 : cost,
    });
  }

  const canRun = !!candles && candles.length > 30 && !loading;

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
      <Field label="What are you testing?">
        <select value={pair} onChange={(e) => setPair(e.target.value)} className={inputClass}>
          {POPULAR_PAIRS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Price history source">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDataSource("market")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              dataSource === "market"
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Use market history
          </button>
          <button
            type="button"
            onClick={() => setDataSource("csv")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              dataSource === "csv"
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Upload CSV
          </button>
        </div>

        {dataSource === "market" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={lookbackDays}
              onChange={(e) => setLookbackDays(e.target.value)}
              className={`${inputClass} max-w-[160px]`}
            >
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
              <option value="365">Last 1 year</option>
              <option value="730">Last 2 years</option>
            </select>
            <button
              type="button"
              onClick={handleLoadMarketData}
              disabled={marketStatus === "loading"}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
            >
              {marketStatus === "loading" ? "Loading…" : "Load price history"}
            </button>
            {marketStatus === "ready" && marketCandles && (
              <span className="text-xs text-emerald-400">
                ✓ {marketCandles.length} daily bars loaded ({marketCandles[0].date} →{" "}
                {marketCandles[marketCandles.length - 1].date})
              </span>
            )}
            {marketStatus === "error" && <span className="text-xs text-orange-400">{marketError}</span>}
          </div>
        )}

        {dataSource === "csv" && (
          <div className="mt-3">
            <label className="inline-flex cursor-pointer items-center rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:border-zinc-500">
              Choose CSV file
              <input type="file" accept=".csv" onChange={handleCsvSelect} className="hidden" />
            </label>
            {csvCandles && (
              <span className="ml-3 text-xs text-emerald-400">
                ✓ {csvCandles.length} bars loaded
                {csvSkipped > 0 ? ` (${csvSkipped} rows skipped)` : ""}
              </span>
            )}
            {csvError && <p className="mt-2 text-xs text-orange-400">{csvError}</p>}
          </div>
        )}
      </Field>

      <Field label="How do you want to define the strategy?">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRuleMode("template")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              ruleMode === "template"
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Pick a template
          </button>
          <button
            type="button"
            onClick={() => setRuleMode("freetext")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              ruleMode === "freetext"
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Describe in plain English
          </button>
        </div>
      </Field>

      {ruleMode === "freetext" && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={3}
            placeholder="e.g. Buy when a 10-day average crosses above a 30-day average, risk 2%, target 6%."
            className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleInterpret}
            disabled={!freeText.trim() || interpreting}
            className="mt-2 rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
          >
            {interpreting ? "Interpreting…" : "Interpret with AI"}
          </button>
          {interpretError && <p className="mt-2 text-xs text-orange-400">{interpretError}</p>}
          {explanation && (
            <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-zinc-300">
              <span className="font-medium text-sky-300">How this was interpreted: </span>
              {explanation}
              <span className="mt-1 block text-zinc-500">
                Review the fields below — edit anything that doesn&apos;t match what you meant.
              </span>
            </div>
          )}
        </div>
      )}

      <Field label="Strategy template">
        <select
          value={strategyType}
          onChange={(e) => setStrategyType(e.target.value as StrategyType)}
          className={inputClass}
        >
          {(Object.keys(STRATEGY_LABELS) as StrategyType[]).map((t) => (
            <option key={t} value={t}>
              {STRATEGY_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      {strategyType === "ma_crossover" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Fast period">
            <input
              type="number"
              min={2}
              value={(params.ma_crossover as Extract<StrategyParams, { type: "ma_crossover" }>).fastPeriod}
              onChange={(e) => updateParam("ma_crossover", { fastPeriod: parseInt(e.target.value, 10) || 2 })}
              className={inputClass}
            />
          </Field>
          <Field label="Slow period">
            <input
              type="number"
              min={3}
              value={(params.ma_crossover as Extract<StrategyParams, { type: "ma_crossover" }>).slowPeriod}
              onChange={(e) => updateParam("ma_crossover", { slowPeriod: parseInt(e.target.value, 10) || 3 })}
              className={inputClass}
            />
          </Field>
          <Field label="Average type">
            <select
              value={(params.ma_crossover as Extract<StrategyParams, { type: "ma_crossover" }>).maKind}
              onChange={(e) => updateParam("ma_crossover", { maKind: e.target.value as "sma" | "ema" })}
              className={inputClass}
            >
              <option value="sma">Simple (SMA)</option>
              <option value="ema">Exponential (EMA)</option>
            </select>
          </Field>
        </div>
      )}

      {strategyType === "breakout" && (
        <Field label="Lookback window (days)" hint="Enter when price closes beyond the high/low of this many prior days.">
          <input
            type="number"
            min={2}
            value={(params.breakout as Extract<StrategyParams, { type: "breakout" }>).lookbackDays}
            onChange={(e) => updateParam("breakout", { lookbackDays: parseInt(e.target.value, 10) || 2 })}
            className={`${inputClass} max-w-[160px]`}
          />
        </Field>
      )}

      {strategyType === "rsi" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="RSI period">
            <input
              type="number"
              min={2}
              value={(params.rsi as Extract<StrategyParams, { type: "rsi" }>).period}
              onChange={(e) => updateParam("rsi", { period: parseInt(e.target.value, 10) || 2 })}
              className={inputClass}
            />
          </Field>
          <Field label="Oversold below">
            <input
              type="number"
              min={1}
              max={49}
              value={(params.rsi as Extract<StrategyParams, { type: "rsi" }>).oversold}
              onChange={(e) => updateParam("rsi", { oversold: parseFloat(e.target.value) || 30 })}
              className={inputClass}
            />
          </Field>
          <Field label="Overbought above">
            <input
              type="number"
              min={51}
              max={99}
              value={(params.rsi as Extract<StrategyParams, { type: "rsi" }>).overbought}
              onChange={(e) => updateParam("rsi", { overbought: parseFloat(e.target.value) || 70 })}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Stop loss %" hint="How far price moves against you before you're out.">
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={stopLossPct}
            onChange={(e) => setStopLossPct(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Take profit %" hint="How far price moves in your favor before you bank it.">
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={takeProfitPct}
            onChange={(e) => setTakeProfitPct(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Trading cost %"
          hint="Spread + slippage, charged on every trade — even 'breakeven' ones lose this."
        >
          <input
            type="number"
            min={0}
            step={0.01}
            value={costPct}
            onChange={(e) => setCostPct(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={!canRun}
        className="self-start rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Run backtest
      </button>
      {!candles && <p className="text-xs text-zinc-500">Load price history above before running.</p>}
    </form>
  );
}
