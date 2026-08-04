"use client";

import { useState } from "react";
import { RiskCalcSharedProvider } from "@/app/components/riskcalc/SharedInputsContext";
import { SharedInputsPanel } from "@/app/components/riskcalc/SharedInputsPanel";
import { PositionSizeTool } from "@/app/components/riskcalc/PositionSizeTool";
import { PipValueTool } from "@/app/components/riskcalc/PipValueTool";
import { RiskRewardTool } from "@/app/components/riskcalc/RiskRewardTool";
import { MarginLeverageTool } from "@/app/components/riskcalc/MarginLeverageTool";
import { CorrelationTool } from "@/app/components/riskcalc/CorrelationTool";

const TABS = [
  { key: "position", label: "Position size", Component: PositionSizeTool },
  { key: "pip", label: "Pip value", Component: PipValueTool },
  { key: "riskReward", label: "Risk/reward", Component: RiskRewardTool },
  { key: "margin", label: "Margin & leverage", Component: MarginLeverageTool },
  { key: "correlation", label: "Correlation risk", Component: CorrelationTool },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function RiskCalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("position");
  const ActiveComponent = TABS.find((t) => t.key === activeTab)!.Component;

  return (
    <RiskCalcSharedProvider>
      <h1 className="text-3xl font-semibold tracking-tight">Risk calculator</h1>
      <p className="mt-2 text-zinc-400">
        Five tools, one shared set of inputs — position size, pip value, risk/reward, margin
        &amp; leverage, and multi-trade correlation risk. Change your account balance or risk
        per trade once and it propagates everywhere below.
      </p>

      <div className="mt-8">
        <SharedInputsPanel />
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <ActiveComponent />
      </div>
    </RiskCalcSharedProvider>
  );
}
