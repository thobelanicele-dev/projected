"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "@/app/api/calendar/route";
import type { PriceRange } from "@/app/api/history/route";
import { RiskCalcSummary, type ResultStat } from "@/app/components/RiskCalcSummary";
import {
  calculatePositionSize,
  getPipSize,
  getStoredSharedInputs,
  setStoredSharedInputs,
  parsePair,
  DEFAULT_SHARED_INPUTS,
} from "@/app/lib/riskCalculator";

export const POPULAR_PAIRS = [
  { value: "EUR/USD", label: "EUR/USD" },
  { value: "GBP/USD", label: "GBP/USD" },
  { value: "USD/JPY", label: "USD/JPY" },
  { value: "USD/CHF", label: "USD/CHF" },
  { value: "AUD/USD", label: "AUD/USD" },
  { value: "NZD/USD", label: "NZD/USD" },
  { value: "USD/CAD", label: "USD/CAD" },
  { value: "XAU/USD", label: "XAU/USD (Gold)" },
  { value: "XAG/USD", label: "XAG/USD (Silver)" },
  { value: "BTC/USD", label: "BTC/USD" },
  { value: "ETH/USD", label: "ETH/USD" },
];

export interface TradeIdeaFields {
  pair: string;
  direction: "long" | "short";
  entryMode: "now" | "condition";
  entryPrice: string;
  entryCondition: string;
  stopLossPrice: string;
  stopLossCondition: string;
  takeProfitPrice: string;
  takeProfitCondition: string;
  riskPercent: string;
}

const emptyFields: TradeIdeaFields = {
  pair: "",
  direction: "long",
  entryMode: "now",
  entryPrice: "",
  entryCondition: "",
  stopLossPrice: "",
  stopLossCondition: "",
  takeProfitPrice: "",
  takeProfitCondition: "",
  riskPercent: "1",
};

interface Template {
  label: string;
  description: string;
  fields: Partial<TradeIdeaFields>;
}

const TEMPLATES: Template[] = [
  {
    label: "Simple breakout",
    description: "Price pushes past a recent high and keeps climbing",
    fields: {
      pair: "EUR/USD",
      direction: "long",
      entryMode: "condition",
      entryCondition: "the price breaks above a recent high and looks like it wants to keep climbing",
      stopLossCondition: "just below that same high, in case it turns out to be a fake breakout",
      takeProfitCondition: "roughly twice as far away as my stop, so a win is worth more than a loss",
      riskPercent: "1",
    },
  },
  {
    label: "Bounce off support",
    description: "Price dips to a level it's bounced off before, then turns back up",
    fields: {
      pair: "GBP/USD",
      direction: "long",
      entryMode: "condition",
      entryCondition: "the price drops to a level it has bounced off before, and starts turning back up",
      stopLossCondition: "just below that same level, in case it breaks instead of bouncing",
      takeProfitCondition: "back up near the recent high",
      riskPercent: "1",
    },
  },
  {
    label: "Breakdown short",
    description: "Price falls through a recent low and keeps dropping",
    fields: {
      pair: "USD/JPY",
      direction: "short",
      entryMode: "condition",
      entryCondition: "the price breaks below a recent low and keeps falling",
      stopLossCondition: "just above that same low, in case it turns out to be a fake breakdown",
      takeProfitCondition: "a round number below where price has struggled to fall past before",
      riskPercent: "1",
    },
  },
];

function formatEventTime(iso: string): string {
  const eventDate = new Date(iso);
  if (isNaN(eventDate.getTime())) return iso;

  const diffMs = eventDate.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "very soon";
  if (diffHours < 24) return `in about ${diffHours}h`;
  return `in about ${Math.round(diffHours / 24)}d`;
}

export interface MarketContext {
  livePrice?: number | null;
  priceRange?: PriceRange | null;
  events?: CalendarEvent[];
}

export function buildIdeaText(f: TradeIdeaFields, context: MarketContext = {}): string {
  const { livePrice, priceRange, events } = context;
  const dirWord = f.direction === "long" ? "go long on" : "go short on";
  const parts: string[] = [`Looking to ${dirWord} ${f.pair}`];

  if (f.entryMode === "now") {
    parts.push("entering right now at market");
  } else {
    const priceBit = f.entryPrice ? `around ${f.entryPrice}` : "";
    const conditionBit = f.entryCondition ? `if ${f.entryCondition}` : "";
    parts.push([priceBit, conditionBit].filter(Boolean).join(" "));
  }

  const tpPriceBit = f.takeProfitPrice ? `targeting ${f.takeProfitPrice}` : "";
  const tpConditionBit = f.takeProfitCondition
    ? f.takeProfitPrice
      ? `(${f.takeProfitCondition})`
      : `targeting ${f.takeProfitCondition}`
    : "";
  const tpBit = [tpPriceBit, tpConditionBit].filter(Boolean).join(" ");
  if (tpBit) parts.push(tpBit);

  const slPriceBit = f.stopLossPrice ? `stop at ${f.stopLossPrice}` : "";
  const slConditionBit = f.stopLossCondition
    ? f.stopLossPrice
      ? `(${f.stopLossCondition})`
      : `stop ${f.stopLossCondition}`
    : "";
  const slBit = [slPriceBit, slConditionBit].filter(Boolean).join(" ");
  if (slBit) parts.push(slBit);

  if (f.riskPercent) parts.push(`risking about ${f.riskPercent}% of my account`);

  const mainSentence = parts.filter(Boolean).join(", ") + ".";
  const priceSentence = livePrice ? ` The current market price is around ${livePrice}.` : "";
  const rangeSentence = priceRange
    ? ` Over the last ${priceRange.periodDays} days, ${f.pair} has ranged between ${priceRange.low} (low) and ${priceRange.high} (high), trending ${priceRange.trend}.`
    : "";
  const eventsSentence =
    events && events.length > 0
      ? ` Upcoming economic events to be aware of: ${events
          .map((e) => `${e.event} (${e.country}, ${e.impact} impact) ${formatEventTime(e.time)}`)
          .join("; ")}.`
      : "";

  return `${mainSentence}${priceSentence}${rangeSentence}${eventsSentence}`;
}

export function InfoTip({ text }: { text: string }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer select-none items-center gap-1 text-xs text-sky-400 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-sky-400/60 text-[10px] leading-none">
          ?
        </span>
        What&apos;s this?
      </summary>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-zinc-400">{text}</p>
    </details>
  );
}

export function Field({
  label,
  hint,
  info,
  tourId,
  children,
}: {
  label: string;
  hint?: string;
  info?: string;
  tourId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5" data-tour={tourId}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {info && <InfoTip text={info} />}
      </div>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none";

const priceOptionalHint =
  "Don't know the exact price? Leave it blank — just describe it in words on the right.";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface ChartImage {
  data: string;
  mediaType: string;
}

export function TradeIdeaForm({
  onSubmit,
  loading,
}: {
  onSubmit: (ideaText: string, chartImage?: ChartImage) => void;
  loading: boolean;
}) {
  const [fields, setFields] = useState<TradeIdeaFields>(emptyFields);
  const [chartImage, setChartImage] = useState<ChartImage | null>(null);
  const [chartPreviewUrl, setChartPreviewUrl] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [customPair, setCustomPair] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceStatus, setPriceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [rangeStatus, setRangeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [accountBalance, setAccountBalance] = useState("10000");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const stored = getStoredSharedInputs();
      if (stored) setAccountBalance(String(stored.accountBalance));
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  function updateAccountBalance(value: string) {
    setAccountBalance(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      setStoredSharedInputs({ ...(getStoredSharedInputs() ?? DEFAULT_SHARED_INPUTS), accountBalance: parsed });
    }
  }

  function update<K extends keyof TradeIdeaFields>(key: K, value: TradeIdeaFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function applyTemplate(template: Template) {
    setFields({ ...emptyFields, ...template.fields });
    setCustomPair(false);
  }

  useEffect(() => {
    const symbol = fields.pair.trim();

    const timeout = setTimeout(() => {
      if (!symbol) {
        setLivePrice(null);
        setPriceStatus("idle");
        return;
      }

      setPriceStatus("loading");
      fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.price === "number") {
            setLivePrice(data.price);
            setPriceStatus("ready");
          } else {
            setLivePrice(null);
            setPriceStatus("error");
          }
        })
        .catch(() => {
          setLivePrice(null);
          setPriceStatus("error");
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [fields.pair]);

  useEffect(() => {
    const symbol = fields.pair.trim();

    const timeout = setTimeout(() => {
      if (!symbol) {
        setCalendarEvents([]);
        setCalendarStatus("idle");
        return;
      }

      setCalendarStatus("loading");
      fetch(`/api/calendar?pair=${encodeURIComponent(symbol)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.events)) {
            setCalendarEvents(data.events);
            setCalendarStatus("ready");
          } else {
            setCalendarEvents([]);
            setCalendarStatus("error");
          }
        })
        .catch(() => {
          setCalendarEvents([]);
          setCalendarStatus("error");
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [fields.pair]);

  useEffect(() => {
    const symbol = fields.pair.trim();

    const timeout = setTimeout(() => {
      if (!symbol) {
        setPriceRange(null);
        setRangeStatus("idle");
        return;
      }

      setRangeStatus("loading");
      fetch(`/api/history?symbol=${encodeURIComponent(symbol)}`)
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.high === "number" && typeof data.low === "number") {
            setPriceRange(data);
            setRangeStatus("ready");
          } else {
            setPriceRange(null);
            setRangeStatus("error");
          }
        })
        .catch(() => {
          setPriceRange(null);
          setRangeStatus("error");
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [fields.pair]);

  const canSubmit = fields.pair.trim().length > 0 && !loading;

  const riskValue = parseFloat(fields.riskPercent);
  const riskTooHigh = !isNaN(riskValue) && riskValue > 2;
  const noStopLossDefined = !fields.stopLossPrice.trim() && !fields.stopLossCondition.trim();

  const positionSizeOutcome = useMemo(() => {
    const balance = parseFloat(accountBalance);
    const risk = parseFloat(fields.riskPercent);
    const entry = fields.entryPrice.trim() ? parseFloat(fields.entryPrice) : livePrice;
    const stop = parseFloat(fields.stopLossPrice);

    if (
      !fields.pair.trim() ||
      entry === null ||
      entry === undefined ||
      isNaN(entry) ||
      !fields.stopLossPrice.trim() ||
      isNaN(stop) ||
      isNaN(balance) ||
      isNaN(risk)
    ) {
      return null;
    }

    const pipSize = getPipSize(parsePair(fields.pair)?.quote ?? "USD");
    const stopLossPips = Math.abs(entry - stop) / pipSize;

    return calculatePositionSize({
      pair: fields.pair,
      stopLossPips,
      exchangeRate: entry,
      shared: {
        accountBalance: balance,
        accountCurrency: "USD",
        riskMode: "percent",
        riskValue: risk,
        lotConvention: "standard",
      },
    });
  }, [accountBalance, fields.riskPercent, fields.pair, fields.entryPrice, fields.stopLossPrice, livePrice]);

  const positionSizeStats: ResultStat[] | undefined = positionSizeOutcome?.ok
    ? [
        { label: "Risk amount", value: `$${positionSizeOutcome.result.riskAmount.toLocaleString()}` },
        { label: "Position size (units)", value: positionSizeOutcome.result.positionUnits.toLocaleString() },
        { label: "Position size (lots)", value: String(positionSizeOutcome.result.positionLots) },
      ]
    : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(
      buildIdeaText(fields, {
        livePrice: priceStatus === "ready" ? livePrice : null,
        priceRange: rangeStatus === "ready" ? priceRange : null,
        events: calendarStatus === "ready" ? calendarEvents : undefined,
      }),
      chartImage ?? undefined
    );
  }

  function handleChartFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setChartError(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setChartError("Please upload a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setChartError("Image must be 5MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      setChartImage({ data: base64, mediaType: file.type });
      setChartPreviewUrl(dataUrl);
    };
    reader.onerror = () => setChartError("Couldn't read that image. Please try again.");
    reader.readAsDataURL(file);
  }

  function removeChartImage() {
    setChartImage(null);
    setChartPreviewUrl(null);
    setChartError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4" data-tour="templates">
        <p className="text-sm font-medium text-zinc-200">New to this? Try an example</p>
        <p className="mt-1 text-xs text-zinc-500">
          Pick a starting point, then edit it to match what you&apos;re actually seeing.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => applyTemplate(t)}
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-xs transition-colors hover:border-zinc-600"
            >
              <span className="block font-medium text-zinc-100">{t.label}</span>
              <span className="mt-0.5 block text-zinc-500">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      <Field
        label="What are you trading?"
        hint="Pick a common pair, or choose Other to type your own."
        tourId="pair"
      >
        {customPair ? (
          <input
            type="text"
            value={fields.pair}
            onChange={(e) => update("pair", e.target.value)}
            placeholder="e.g. EUR/JPY"
            className={inputClass}
          />
        ) : (
          <select
            value={fields.pair}
            onChange={(e) => {
              if (e.target.value === "__other__") {
                setCustomPair(true);
                update("pair", "");
              } else {
                update("pair", e.target.value);
              }
            }}
            className={inputClass}
          >
            <option value="">Select an instrument…</option>
            {POPULAR_PAIRS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
            <option value="__other__">Other…</option>
          </select>
        )}
        {priceStatus === "loading" && (
          <span className="text-xs text-zinc-500">Fetching live price…</span>
        )}
        {priceStatus === "error" && (
          <span className="text-xs text-zinc-500">
            Live price unavailable — no problem, you can still describe everything in words below.
          </span>
        )}
        {priceStatus === "ready" && livePrice !== null && (
          <span className="text-xs text-emerald-400">
            Current price: <span className="font-medium">{livePrice}</span> — use this as a
            reference point for your entry, stop, and target.
          </span>
        )}
        {rangeStatus === "ready" && priceRange && (
          <span className="text-xs text-sky-400">
            {priceRange.periodDays}-day range: <span className="font-medium">{priceRange.low}</span>{" "}
            – <span className="font-medium">{priceRange.high}</span> (trending {priceRange.trend})
          </span>
        )}
        {calendarStatus === "ready" && calendarEvents.length > 0 && (
          <div className="mt-1 rounded-lg border border-orange-500/30 bg-orange-500/5 p-2.5">
            <p className="text-xs font-medium text-orange-400">
              Upcoming news that could move this market:
            </p>
            <ul className="mt-1 space-y-0.5">
              {calendarEvents.map((e, i) => (
                <li key={i} className="text-xs text-zinc-400">
                  <span className="text-zinc-300">{e.event}</span> ({e.country},{" "}
                  <span
                    className={e.impact.toLowerCase() === "high" ? "text-red-400" : "text-orange-300"}
                  >
                    {e.impact} impact
                  </span>
                  ) — {formatEventTime(e.time)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Field>

      <Field
        label="Which way do you think it's going?"
        info="'Long' means you think the price will rise — you buy now, hoping to sell later for more. 'Short' means you think the price will fall — you effectively sell first, planning to buy back later at a lower price. Short trades are a more advanced concept, so stick with Long until you're comfortable."
      >
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update("direction", "long")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              fields.direction === "long"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Long — price will go up
          </button>
          <button
            type="button"
            onClick={() => update("direction", "short")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              fields.direction === "short"
                ? "border-red-500 bg-red-500/15 text-red-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Short — price will go down
          </button>
        </div>
      </Field>

      <Field
        label="When do you want to enter?"
        info="Your 'entry' is the price where your trade actually opens. 'Right now' jumps in immediately at whatever the current price happens to be. 'Wait for a price/condition' means you only enter once something specific happens first — e.g. the price reaching a certain level — which usually gives you more control than jumping in blind."
      >
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update("entryMode", "now")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              fields.entryMode === "now"
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Right now (market)
          </button>
          <button
            type="button"
            onClick={() => update("entryMode", "condition")}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              fields.entryMode === "condition"
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Wait for a price / condition
          </button>
        </div>
        {fields.entryMode === "condition" && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={fields.entryPrice}
              onChange={(e) => update("entryPrice", e.target.value)}
              placeholder="Entry price (optional), e.g. 2410"
              className={inputClass}
            />
            <input
              type="text"
              value={fields.entryCondition}
              onChange={(e) => update("entryCondition", e.target.value)}
              placeholder="What has to happen first? e.g. it breaks above the London high"
              className={inputClass}
            />
          </div>
        )}
      </Field>

      <Field
        label="Stop loss — where you'll get out if you're wrong"
        hint={`${priceOptionalHint} This is still the most important field — it caps how much you can lose on this trade, so try to fill in at least the "why" even if you skip the price.`}
        info="A stop loss is a safety net: an exact point where you'll automatically exit if the trade goes against you. Without one, a bad trade has no limit on how much it can cost you — this single field is the difference between a controlled loss and an account-ending one."
        tourId="stop-loss"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={fields.stopLossPrice}
            onChange={(e) => update("stopLossPrice", e.target.value)}
            placeholder="Stop loss price, e.g. 2395"
            className={inputClass}
          />
          <input
            type="text"
            value={fields.stopLossCondition}
            onChange={(e) => update("stopLossCondition", e.target.value)}
            placeholder="Why there? e.g. below the recent swing low"
            className={inputClass}
          />
        </div>
        {noStopLossDefined && (
          <p className="mt-1 text-xs text-orange-400">
            You haven&apos;t set a stop loss yet. Every experienced trader defines one before entering —
            even just a reason in words is better than nothing.
          </p>
        )}
      </Field>

      <Field
        label="Take profit — where you'll bank the win"
        hint={priceOptionalHint}
        info="A take profit is the price where you plan to exit and lock in your gains if the trade goes your way. It doesn't have to be exact — even a rough idea of 'where' helps you judge whether the potential win is worth the risk you're taking."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={fields.takeProfitPrice}
            onChange={(e) => update("takeProfitPrice", e.target.value)}
            placeholder="Take profit price, e.g. 2450"
            className={inputClass}
          />
          <input
            type="text"
            value={fields.takeProfitCondition}
            onChange={(e) => update("takeProfitCondition", e.target.value)}
            placeholder="Why there? e.g. the Asian range high"
            className={inputClass}
          />
        </div>
      </Field>

      <Field
        label="How much of your account are you risking?"
        hint="Most experienced traders risk 1–2% of their account per trade. Higher than that is a bigger bet than it might feel like."
        info="This is how much of your total trading money you're willing to lose if this trade hits your stop loss — not how much you're putting into the trade overall. Keeping this small (1-2%) means no single bad trade can seriously damage your account, even if you have a string of losses in a row."
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            value={fields.riskPercent}
            onChange={(e) => update("riskPercent", e.target.value)}
            className={`${inputClass} max-w-[120px]`}
          />
          <span className="text-sm text-zinc-400">% of account</span>
        </div>
        {riskTooHigh && (
          <p className="mt-1 text-xs text-orange-400">
            {fields.riskPercent}% is higher than what most experienced traders risk on one trade —
            a short losing streak could hurt a lot more than it might feel like right now.
          </p>
        )}
      </Field>

      <Field
        label="Account balance"
        hint="Used to turn your risk % into an actual position size below. Saved locally so you don't have to re-enter it."
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">$</span>
          <input
            type="number"
            min="0"
            step="1"
            value={accountBalance}
            onChange={(e) => updateAccountBalance(e.target.value)}
            className={`${inputClass} max-w-[160px]`}
          />
        </div>
      </Field>

      {positionSizeOutcome ? (
        <RiskCalcSummary
          stats={positionSizeStats}
          warnings={positionSizeOutcome.ok ? positionSizeOutcome.warnings : undefined}
          errors={!positionSizeOutcome.ok ? positionSizeOutcome.errors : undefined}
        />
      ) : (
        <p className="text-xs text-zinc-500">
          Add numeric entry and stop-loss prices (and an account balance) to see position size.
        </p>
      )}

      <Field
        label="Attach a chart screenshot (optional)"
        hint="We'll check it against the plan above — it never overrides what you've already described."
      >
        {chartPreviewUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chartPreviewUrl}
              alt="Chart screenshot preview"
              className="h-16 w-16 rounded-lg border border-zinc-800 object-cover"
            />
            <button
              type="button"
              onClick={removeChartImage}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleChartFileChange}
            className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-zinc-800 file:bg-zinc-950 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:border-zinc-600"
          />
        )}
        {chartError && <span className="text-xs text-orange-400">{chartError}</span>}
      </Field>

      <button
        type="submit"
        disabled={!canSubmit}
        data-tour="submit"
        className="self-start rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Structuring plan…" : "Build trade plan"}
      </button>
    </form>
  );
}
