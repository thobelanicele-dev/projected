import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { getReview, isInFirstFive, submitReview } from "@/app/lib/betaReward";
import { checkRateLimit } from "@/app/lib/rateLimit";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_BODY_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`beta-review:${session.id}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
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

  const { rating, body: reviewBody } = (body ?? {}) as { rating?: unknown; body?: unknown };
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  if (typeof reviewBody !== "string" || !reviewBody.trim()) {
    return NextResponse.json({ error: "Review text is required." }, { status: 400 });
  }
  if (reviewBody.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Review must be ${MAX_BODY_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  try {
    const eligible = await isInFirstFive(session.id);
    if (!eligible) {
      return NextResponse.json({ error: "Beta reward slots are full." }, { status: 403 });
    }

    const existing = await getReview(session.id);
    if (existing) {
      return NextResponse.json({ error: "You've already submitted a review." }, { status: 400 });
    }

    await submitReview(session.id, rating, reviewBody.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Beta review submission failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
