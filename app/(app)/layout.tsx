import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { ProductTour, TOUR_STEPS } from "@/app/components/ProductTour";
import { Toaster } from "@/app/components/Toaster";
import { CurrentUserProvider } from "@/app/components/CurrentUserProvider";
import { getSession } from "@/app/lib/auth/session";
import { effectiveTier } from "@/app/lib/planLimits";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <CurrentUserProvider userId={session.id} tier={effectiveTier(session)}>
      <div className="flex min-h-screen bg-black text-zinc-50">
        <Sidebar />
        {/* min-w-0 lets wide content (like the calculator's tab row) scroll inside its own box instead of stretching the whole page. */}
        <main className="flex min-w-0 flex-1 justify-center px-6 py-16">
          <div className="w-full min-w-0 max-w-2xl">{children}</div>
        </main>
        <ProfileMenu user={session} />
        <ProductTour steps={TOUR_STEPS} />
        <Toaster />
      </div>
    </CurrentUserProvider>
  );
}
