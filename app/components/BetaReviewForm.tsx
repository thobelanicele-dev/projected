"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BetaReviewForm() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || rating < 1 || !body.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/beta/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">Leave a review</p>
        <p className="mt-1 text-xs text-zinc-500">
          A few honest words about how it&apos;s going, this is what unlocks your reward.
        </p>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={`text-2xl leading-none transition-colors ${
              n <= rating ? "text-emerald-400" : "text-zinc-700 hover:text-zinc-500"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="What's working, what isn't, anything you'd want us to know."
        className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
      />

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || rating < 1 || !body.trim()}
        className="self-start rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
