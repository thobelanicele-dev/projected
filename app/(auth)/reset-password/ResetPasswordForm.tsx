"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h1 className="text-lg font-medium text-red-400">Missing reset token</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Use the link from your password reset email, or{" "}
          <Link href="/forgot-password" className="text-sky-400 hover:text-sky-300">
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h1 className="text-lg font-medium text-emerald-400">Password updated</h1>
        <p className="mt-2 text-sm text-zinc-400">
          You&apos;ve been logged out everywhere else for safety.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h1 className="text-xl font-medium text-zinc-50">Choose a new password</h1>

      <Field label="New password" hint="8-72 characters.">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
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
        disabled={loading}
        className="rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
