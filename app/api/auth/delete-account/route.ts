import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { verifyPassword } from "@/app/lib/auth/password";
import { getSession, destroySession } from "@/app/lib/auth/session";
import { fetchSubscription, disableSubscription } from "@/app/lib/paystack";
import { checkRateLimit } from "@/app/lib/rateLimit";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`delete-account:${session.id}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { currentPassword } = (body ?? {}) as { currentPassword?: unknown };
  if (typeof currentPassword !== "string") {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  try {
    const rows = await query<{ password_hash: string; paystack_subscription_code: string | null }>(
      "SELECT password_hash, paystack_subscription_code FROM users WHERE id = $1",
      [session.id]
    );
    const user = rows[0];
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    if (user.paystack_subscription_code) {
      try {
        const sub = await fetchSubscription(user.paystack_subscription_code);
        await disableSubscription(sub.subscriptionCode, sub.emailToken);
      } catch (error) {
        // A billing-API hiccup shouldn't block someone from deleting their own
        // account — log it clearly for a rare manual follow-up and proceed.
        console.error(
          `Failed to cancel Paystack subscription ${user.paystack_subscription_code} for user ${session.id} during account deletion`,
          error
        );
      }
    }

    await query("DELETE FROM sessions WHERE user_id = $1", [session.id]);
    await query("DELETE FROM email_verification_tokens WHERE user_id = $1", [session.id]);
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [session.id]);
    await query("DELETE FROM email_change_tokens WHERE user_id = $1", [session.id]);
    await query("DELETE FROM users WHERE id = $1", [session.id]);

    await destroySession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete account failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
