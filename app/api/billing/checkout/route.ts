import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { initializeTransaction, isBillingEnabled, isTier, PLAN_CODES } from "@/app/lib/paystack";
import { subscriptionState } from "@/app/lib/planLimits";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: "Paid plans aren't open yet." }, { status: 503 });
  }

  let session;
  try {
    session = await getSession();
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json({ error: "Something went wrong on our end. Please try again in a moment." }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to subscribe." }, { status: 401 });
  }

  const state = subscriptionState(session);
  if (state === "active") {
    return NextResponse.json(
      { error: "You already have an active plan. Email support@fxinsites.com to change it." },
      { status: 409 }
    );
  }
  if (state === "cancelling") {
    return NextResponse.json(
      { error: "Your current plan is still paid for. You can subscribe again once it ends." },
      { status: 409 }
    );
  }

  const rateLimit = checkRateLimit(`billing-checkout:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
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

  const { tier } = (body ?? {}) as { tier?: unknown };
  if (!isTier(tier)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  try {
    const { authorizationUrl } = await initializeTransaction(
      session.email,
      PLAN_CODES[tier],
      `${appUrl}/billing/callback`
    );
    return NextResponse.json({ url: authorizationUrl });
  } catch (error) {
    console.error("Paystack checkout initialization failed", error);
    return NextResponse.json({ error: "Failed to start checkout. Please try again." }, { status: 500 });
  }
}
