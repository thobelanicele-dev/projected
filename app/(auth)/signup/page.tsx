"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, inputClass } from "@/app/components/TradeIdeaForm";
import { GoogleIcon } from "@/app/components/GoogleIcon";
import { googleErrorMessage } from "@/app/components/googleOAuthErrors";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    googleErrorMessage(searchParams.get("error"))
  );
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
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

  if (done) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h1 className="text-lg font-medium text-zinc-50">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-400">
          We sent a verification link to {email}. Click it to activate your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <h1 className="text-xl font-medium text-zinc-50">Create your account</h1>

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

      <Field
        label="Username"
        hint="3-20 characters, letters/numbers/underscore, must start with a letter."
      >
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={inputClass}
        />
      </Field>

      <Field label="Password" hint="8-72 characters.">
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
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-sky-400 hover:text-sky-300">
          Log in
        </Link>
      </p>

      <p className="text-center text-xs text-zinc-600">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="text-sky-400 hover:text-sky-300">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-sky-400 hover:text-sky-300">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
