import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16 text-zinc-50">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center text-lg font-semibold tracking-tight text-zinc-50"
        >
          FxInsites
        </Link>
        {children}
      </div>
    </div>
  );
}
