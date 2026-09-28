import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/auth/session";
import { isInFirstFive, hasUsedAnyTool, getReview, FIRST_N_COUNT } from "@/app/lib/betaReward";
import { BetaReviewForm } from "@/app/components/BetaReviewForm";

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={done ? "text-emerald-400" : "text-zinc-600"}>{done ? "✓" : "○"}</span>
      <span className={done ? "text-zinc-200" : "text-zinc-500"}>{label}</span>
    </li>
  );
}

export default async function BetaRewardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const eligible = await isInFirstFive(session.id);

  if (!eligible) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Beta reward</h1>
        <p className="text-sm text-zinc-500">
          Beta reward slots are full, the $5 Amazon gift card was reserved for the first{" "}
          {FIRST_N_COUNT} people to sign up.
        </p>
      </div>
    );
  }

  const [usedTool, review] = await Promise.all([hasUsedAnyTool(session.id), getReview(session.id)]);
  const emailVerified = session.emailVerified;
  const allDone = emailVerified && usedTool && review !== null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Beta reward</h1>
        <p className="mt-1 text-sm text-zinc-500">
          You&apos;re one of the first {FIRST_N_COUNT} people to sign up. Complete these to
          unlock a $5 Amazon gift card.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        <ChecklistItem done label="Signed up" />
        <ChecklistItem done={emailVerified} label="Verified your email" />
        <ChecklistItem
          done={usedTool}
          label="Used a tool (planner, backtest, journal, or risk calculator)"
        />
        <ChecklistItem done={review !== null} label="Left a review" />
      </ul>

      {!emailVerified && (
        <p className="text-sm text-orange-400">
          Check your inbox for a verification link, or request a new one from the login page.
        </p>
      )}

      {!review && <BetaReviewForm />}

      {allDone && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          You&apos;re qualified for your $5 Amazon gift card. We&apos;ll send it to {session.email}.
        </div>
      )}
    </div>
  );
}
