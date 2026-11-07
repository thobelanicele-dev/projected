import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/auth/session";
import { activateSubscription, claimPaymentReference, releasePaymentReference } from "@/app/lib/subscriptionActivation";
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
  let alreadyUsed = false;
  if (reference) {
    const result = await verifyTransaction(reference);
    const tier = result.planCode ? tierForPlanCode(result.planCode) : null;

    // The reference comes from the URL, so only honor a payment that was made
    // with this account's own email; otherwise one person's successful payment
    // reference could activate a plan on someone else's account.
    const paidByThisAccount = result.email?.toLowerCase() === session.email.toLowerCase();

    if (result.success && tier && paidByThisAccount) {
      // A payment can switch a plan on once. Without this, an old reference
      // could be reopened after cancelling to get the paid plan back for free.
      if (await claimPaymentReference(reference, session.id)) {
        try {
          await activateSubscription({
            where: { id: session.id },
            tier,
            customerCode: result.customerCode,
            subscriptionCode: result.subscriptionCode,
          });
          success = true;
        } catch (error) {
          await releasePaymentReference(reference);
          throw error;
        }
      } else {
        alreadyUsed = true;
      }
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
          ) : alreadyUsed ? (
            <>
              <h1 className="text-lg font-medium text-zinc-50">This payment was already applied</h1>
              <p className="mt-2 text-sm text-zinc-400">
                This link has been used once and can&apos;t be used again. Your plan is shown in your account settings.
              </p>
              <Link href="/account" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
                Go to account settings
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-lg font-medium text-red-400">We couldn&apos;t confirm this payment</h1>
              <p className="mt-2 text-sm text-zinc-400">
                If you completed checkout, this may just be a delay. Check back in a minute, or try again.
              </p>
              <Link href="/planner" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
                Back to the app
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
