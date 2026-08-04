import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/auth/session";
import { query } from "@/app/lib/db";
import { verifyTransaction, tierForPlanCode } from "@/app/lib/paystack";

export default async function BillingCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const reference = typeof params.reference === "string" ? params.reference : null;

  let success = false;
  if (reference) {
    const result = await verifyTransaction(reference);
    const tier = result.planCode ? tierForPlanCode(result.planCode) : null;

    if (result.success && tier) {
      await query(
        `UPDATE users
         SET plan = $1, subscription_status = 'active', paystack_customer_code = $2, paystack_subscription_code = $3
         WHERE id = $4`,
        [tier, result.customerCode, result.subscriptionCode, session.id]
      );
      success = true;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16 text-zinc-50">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-lg font-semibold tracking-tight text-zinc-50">
          FxInsites
        </Link>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
          {success ? (
            <>
              <h1 className="text-lg font-medium text-emerald-400">Payment confirmed</h1>
              <p className="mt-2 text-sm text-zinc-400">Your plan is now active.</p>
              <Link
                href="/planner"
                className="mt-4 inline-block rounded-full bg-zinc-50 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-300"
              >
                Go to the planner
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-lg font-medium text-red-400">We couldn&apos;t confirm this payment</h1>
              <p className="mt-2 text-sm text-zinc-400">
                If you completed checkout, this may just be a delay — check back in a minute, or try again.
              </p>
              <Link href="/#pricing" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
                Back to pricing
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
