"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setLoading(false);
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h1 className="text-lg font-medium text-zinc-50">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-400">
          If an account exists for {email}, we&apos;ve sent a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h1 className="text-xl font-medium text-zinc-50">Reset your password</h1>
      <p className="text-sm text-zinc-400">Enter your email and we&apos;ll send you a reset link.</p>

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="text-sky-400 hover:text-sky-300">
          Back to login
        </Link>
      </p>
    </form>
  );
}
