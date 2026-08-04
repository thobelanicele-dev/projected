import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { initializeTransaction, isTier, PLAN_CODES } from "@/app/lib/paystack";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in to subscribe." }, { status: 401 });
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
