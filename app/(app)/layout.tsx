import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppTopBar } from "@/app/components/AppTopBar";
import { BottomTabBar } from "@/app/components/ToolNav";
import { CommandPalette } from "@/app/components/CommandPalette";
import { PageFrame } from "@/app/components/PageFrame";
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
      <div className="min-h-screen bg-black text-zinc-50">
        <AppTopBar profile={<ProfileMenu user={session} />} />
        {/* min-w-0 lets wide content (like the calculator's tab row) scroll inside its own box instead of stretching the page. The bottom padding on phones clears the tab bar. */}
        <main className="flex min-w-0 justify-center px-4 pb-28 pt-8 md:px-6 md:pb-16 md:pt-10">
          <PageFrame>{children}</PageFrame>
        </main>
        <BottomTabBar />
        <CommandPalette />
        <ProductTour steps={TOUR_STEPS} />
        <Toaster />
      </div>
    </CurrentUserProvider>
  );
}
