import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { getSession } from "@/app/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-black text-zinc-50">
      <Sidebar />
      <main className="flex flex-1 justify-center px-6 py-16">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
