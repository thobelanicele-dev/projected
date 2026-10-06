"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { GoogleIcon } from "@/app/components/GoogleIcon";
import { googleErrorMessage } from "@/app/components/googleOAuthErrors";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    googleErrorMessage(searchParams.get("error"))
  );
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    setResendState("idle");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        if (res.status === 403) setNeedsVerification(true);
        return;
      }
      router.push("/planner");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendState === "sending") return;
    setResendState("sending");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setResendState("sent");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h1 className="text-xl font-medium text-zinc-50">Log in</h1>

      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800"
      >
        <GoogleIcon className="h-4 w-4" />
        Continue with Google
      </a>

      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <div className="h-px flex-1 bg-zinc-800" />
        <span>OR</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
      </Field>

      <Field label="Password">
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
          {needsVerification && (
            <div className="mt-2">
              {resendState === "sent" ? (
                <span className="text-zinc-400">
                  If that email has an account, a new verification link is on its way.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === "sending"}
                  className="text-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {resendState === "sending" ? "Sending…" : "Resend verification email"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Logging in…" : "Log in"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-sky-400 hover:text-sky-300">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-sky-400 hover:text-sky-300">
          Create an account
        </Link>
      </div>
    </form>
  );
}
