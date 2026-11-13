import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";
import { consumeUsage, getAiPlansToday, getUsage, refundUsage } from "@/app/lib/planUsage";
import {
  effectiveTier,
  limitReachedMessage,
  nextDailyResetDate,
  nextResetDate,
  PLAN_LIMITS,
} from "@/app/lib/planLimits";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
// Refunds are rarer than runs: at most this many in a window, per person.
const REFUND_LIMIT = 6;

/** The caller's plan, its limits, and how much of this month they've used. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`limits:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const tier = effectiveTier(session);
    const limits = PLAN_LIMITS[tier];
    const usage = await getUsage(session.id);
    // Only plans with a daily cap count per day, so only they need the lookup.
    const aiPlansToday = limits.aiPlansPerDay === null ? 0 : await getAiPlansToday(session.id);
    return NextResponse.json({
      tier,
      limits,
      usage: { ...usage, aiPlansToday },
      resetsAt: nextResetDate().toISOString(),
      dailyResetsAt: nextDailyResetDate().toISOString(),
    });
  } catch (error) {
    console.error("Limits lookup failed", error);
    return NextResponse.json({ error: "Something went wrong on our end." }, { status: 503 });
  }
}

/**
 * Backtests run in the browser, so the page asks here for permission before
 * each run. AI plans are counted inside /api/plan itself and can't be spent
 * from here.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`limits-use:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if ((body as { metric?: unknown } | null)?.metric !== "backtestRuns") {
    return NextResponse.json({ error: "Unknown metric." }, { status: 400 });
  }

  try {
    const tier = effectiveTier(session);
    const limit = PLAN_LIMITS[tier].backtestRuns;
    const { allowed } = await consumeUsage(session.id, "backtestRuns", limit);
    if (!allowed) {
      return NextResponse.json(
        { error: limitReachedMessage("backtestRuns", tier, limit ?? 0), code: "limit_reached" },
        { status: 403 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Backtest usage check failed", error);
    return NextResponse.json({ error: "Something went wrong on our end." }, { status: 503 });
  }
}

/**
 * Gives back a backtest run that found nothing. A run that turns up no trades
 * (usually because the history is too short for the strategy) shouldn't cost a
 * Free user one of their few monthly runs. The simulation runs in the browser,
 * so this is the browser asking; the cap on how often it can ask keeps it from
 * being a way around the limit.
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`limits-refund:${session.id}`, REFUND_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if ((body as { metric?: unknown } | null)?.metric !== "backtestRuns") {
    return NextResponse.json({ error: "Unknown metric." }, { status: 400 });
  }

  await refundUsage(session.id, "backtestRuns");
  return NextResponse.json({ ok: true });
}
