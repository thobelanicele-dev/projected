import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";
import { consumeUsage, getUsage } from "@/app/lib/planUsage";
import {
  effectiveTier,
  limitReachedMessage,
  nextResetDate,
  PLAN_LIMITS,
} from "@/app/lib/planLimits";

const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

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
    const usage = await getUsage(session.id);
    return NextResponse.json({
      tier,
      limits: PLAN_LIMITS[tier],
      usage,
      resetsAt: nextResetDate().toISOString(),
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
