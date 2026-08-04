"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { JournalEntryCard } from "@/app/components/JournalEntryCard";
import { EquityCurve } from "@/app/components/EquityCurve";
import { StatTile } from "@/app/components/StatTile";
import {
  loadJournal,
  updateJournalEntry,
  deleteJournalEntry,
  clearJournal,
  computeStats,
  addImportedEntries,
  type JournalEntry,
} from "@/app/lib/journal";
import { parseTradeCsv, rowsToJournalEntries, type ImportResult } from "@/app/lib/importTrades";

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setEntries(loadJournal()), 0);
    return () => clearTimeout(timeout);
  }, []);

  const stats = computeStats(entries);

  function handleUpdate(id: string, updates: Partial<JournalEntry>) {
    setEntries(updateJournalEntry(id, updates));
  }

  function handleDelete(id: string) {
    setEntries(deleteJournalEntry(id));
  }

  function handleClear() {
    clearJournal();
    setEntries([]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportError(null);
    file
      .text()
      .then((text) => {
        const result = parseTradeCsv(text);
        if (result.validCount === 0) {
          setImportError(
            "Couldn't find any recognizable trades in that file. Expected columns like symbol/type/open price/close price (MT4 or TradingView export format)."
          );
          return;
        }
        setImportPreview(result);
      })
      .catch(() => setImportError("Couldn't read that file."));
  }

  function handleConfirmImport() {
    if (!importPreview) return;
    const newEntries = rowsToJournalEntries(importPreview.rows);
    setEntries(addImportedEntries(newEntries));
    setImportPreview(null);
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Trade journal</h1>
      <p className="mt-2 text-zinc-400">
        Every plan you build gets saved here. Mark trades as taken, log the outcome, and see
        your discipline and results add up over time.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Trades logged" value={String(stats.totalTrades)} />
        <StatTile label="Win rate" value={stats.winRate !== null ? `${stats.winRate}%` : "—"} />
        <StatTile label="Avg R" value={stats.avgR !== null ? `${stats.avgR}R` : "—"} />
        <StatTile
          label="Total P/L"
          value={stats.totalProfitAmount !== null ? `${stats.totalProfitAmount >= 0 ? "+" : ""}${stats.totalProfitAmount}` : "—"}
          hint="From imported trades with a profit figure"
        />
        <StatTile
          label="Rule adherence"
          value={stats.ruleAdherenceRate !== null ? `${stats.ruleAdherenceRate}%` : "—"}
          hint={`Planner trades only (${stats.ruleAdherenceSampleSize})`}
        />
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Equity curve (R)</p>
        <EquityCurve points={stats.equityCurve} />
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-sm font-medium text-zinc-200">Import past trades</p>
        <p className="mt-1 text-xs text-zinc-500">
          Upload a CSV export from MT4 (Account History → Save as Report) or TradingView (trade
          history export). These land as closed trades with no AI plan attached.
        </p>
        <label className="mt-3 inline-flex cursor-pointer items-center rounded-full border border-zinc-700 px-4 py-1.5 text-xs text-zinc-200 hover:border-zinc-500">
          Choose CSV file
          <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        </label>
        {importError && <p className="mt-2 text-xs text-orange-400">{importError}</p>}
      </div>

      {importPreview && (
        <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
          <p className="text-sm font-medium text-zinc-100">
            {importPreview.validCount} trade{importPreview.validCount === 1 ? "" : "s"} ready to
            import
            {importPreview.skippedCount > 0
              ? ` — ${importPreview.skippedCount} row${importPreview.skippedCount === 1 ? "" : "s"} skipped (couldn't parse)`
              : ""}
            .
          </p>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-400">
            {importPreview.rows
              .filter((r) => r.valid)
              .slice(0, 8)
              .map((r, i) => (
                <div key={i}>
                  {r.symbol} · {r.direction} · entry {r.entryPrice ?? "—"} → exit{" "}
                  {r.exitPrice ?? "—"}
                  {r.profit !== null ? ` · P/L ${r.profit}` : ""}
                </div>
              ))}
            {importPreview.validCount > 8 && (
              <div>…and {importPreview.validCount - 8} more</div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirmImport}
              className="rounded-full bg-zinc-50 px-4 py-1.5 text-xs font-medium text-black transition-colors hover:bg-zinc-300"
            >
              Import {importPreview.validCount} trade{importPreview.validCount === 1 ? "" : "s"}
            </button>
            <button
              type="button"
              onClick={() => setImportPreview(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {entries.length > 0 ? (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-zinc-500">All entries</p>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear journal
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {entries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-10 text-sm text-zinc-500">
          No trades yet. Build a plan on the{" "}
          <Link href="/planner" className="text-sky-400 hover:text-sky-300">
            planner
          </Link>{" "}
          and it&apos;ll show up here.
        </p>
      )}
    </>
  );
}
