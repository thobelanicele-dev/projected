import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { query } from "@/app/lib/db";
import { disableSubscription, fetchSubscription } from "@/app/lib/paystack";
import { subscriptionState } from "@/app/lib/planLimits";
import { checkRateLimit } from "@/app/lib/rateLimit";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Stops a paid plan from renewing. The person keeps the plan until the end of
 * the period they've already paid for, then drops to Free on their own.
 */
export async function POST() {
  let session;
  try {
    session = await getSession();
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`billing-cancel:${session.id}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const state = subscriptionState(session);
  if (state === "cancelling") {
    return NextResponse.json({ error: "Your plan is already cancelled." }, { status: 409 });
  }
  if (state !== "active") {
    return NextResponse.json({ error: "You don't have an active paid plan to cancel." }, { status: 400 });
  }

  try {
    const rows = await query<{ paystack_subscription_code: string | null }>(
      "SELECT paystack_subscription_code FROM users WHERE id = $1",
      [session.id]
    );
    const code = rows[0]?.paystack_subscription_code;
    if (!code) {
      return NextResponse.json(
        { error: "We couldn't find your subscription. Please email support@fxinsites.com." },
        { status: 409 }
      );
    }

    // Read the paid-through date first: it's what we promise to honor. If we
    // can't tell what they've paid for, don't cancel blind.
    const sub = await fetchSubscription(code);
    if (sub.paidThrough === null || sub.paidThrough <= Date.now()) {
      return NextResponse.json(
        { error: "We couldn't confirm your billing date. Please email support@fxinsites.com to cancel." },
        { status: 502 }
      );
    }

    await disableSubscription(sub.subscriptionCode, sub.emailToken);

    await query(
      "UPDATE users SET subscription_status = 'cancelling', plan_ends_at = $1 WHERE id = $2",
      [sub.paidThrough, session.id]
    );

    return NextResponse.json({ ok: true, endsAt: sub.paidThrough });
  } catch (error) {
    console.error("Cancel subscription failed", error);
    return NextResponse.json(
      { error: "We couldn't cancel your plan. Please try again, or email support@fxinsites.com." },
      { status: 500 }
    );
  }
}
