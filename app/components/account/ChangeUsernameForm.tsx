"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { showToast } from "@/app/lib/toast";

export function ChangeUsernameForm({ currentUsername }: { currentUsername: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = username.trim() === currentUsername;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || unchanged) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setUsername(data.username);
      showToast({ message: "Username updated", tone: "success" });
      // Re-reads the page so the new name shows in the heading and the account menu.
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Username">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={20}
          autoComplete="username"
          className={inputClass}
        />
      </Field>
      <p className="-mt-2 text-xs text-zinc-500">3-20 characters. Start with a letter; letters, numbers and underscores only.</p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading || unchanged}
        className="self-start rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}
