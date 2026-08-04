"use client";

import { useState } from "react";
import { POPULAR_PAIRS, Field, inputClass } from "@/app/components/TradeIdeaForm";

export function PairInput({
  label = "Currency pair",
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState(() => !POPULAR_PAIRS.some((p) => p.value === value));

  return (
    <Field label={label}>
      {custom ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. EUR/GBP"
          className={inputClass}
        />
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === "__other__") {
              setCustom(true);
              onChange("");
            } else {
              onChange(e.target.value);
            }
          }}
          className={inputClass}
        >
          <option value="">Select a pair…</option>
          {POPULAR_PAIRS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="__other__">Other…</option>
        </select>
      )}
    </Field>
  );
}
