import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/app/components/Sidebar";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { ProductTour, TOUR_STEPS } from "@/app/components/ProductTour";
import { BetaRewardBanner } from "@/app/components/BetaRewardBanner";
import { getSession } from "@/app/lib/auth/session";
import { isInFirstFive, hasUsedAnyTool, getReview } from "@/app/lib/betaReward";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  let showBetaBanner = false;
  if (await isInFirstFive(session.id)) {
    const [usedTool, review] = await Promise.all([hasUsedAnyTool(session.id), getReview(session.id)]);
    showBetaBanner = !(session.emailVerified && usedTool && review !== null);
  }

  return (
    <div className="flex min-h-screen bg-black text-zinc-50">
      <Sidebar />
      <main className="flex flex-1 justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          {showBetaBanner && <BetaRewardBanner />}
          {children}
        </div>
      </main>
      <ProfileMenu user={session} />
      <ProductTour steps={TOUR_STEPS} />
    </div>
  );
}
