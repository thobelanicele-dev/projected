"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";

export function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const canSubmit = confirmText === "DELETE" && password.length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setDeleted(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (deleted) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h2 className="text-base font-medium text-zinc-100">Your account has been deleted</h2>
        <p className="mt-2 text-sm text-zinc-400">Sorry to see you go.</p>
        <Link href="/" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
          Back to FxInsites
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-red-900/50 bg-red-950/10 p-5"
    >
      <div>
        <h2 className="text-sm font-medium text-red-400">Delete account</h2>
        <p className="mt-1 text-xs text-zinc-500">
          This permanently deletes your account and everything tied to it on our servers. This
          can&apos;t be undone. Your trade journal, drafts, and checklists (stored only in this
          browser) won&apos;t be affected, since we never had a copy of them.
        </p>
      </div>

      <Field label={'Type "DELETE" to confirm'}>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Current password">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="self-start rounded-full bg-red-500/15 px-5 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Deleting…" : "Permanently delete my account"}
      </button>
    </form>
  );
}
