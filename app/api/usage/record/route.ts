import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth/session";
import { isTrackedTool, recordToolUsage } from "@/app/lib/usage";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`usage-record:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { tool } = (body ?? {}) as { tool?: unknown };
  if (!isTrackedTool(tool)) {
    return NextResponse.json({ error: "Unknown tool." }, { status: 400 });
  }

  try {
    await recordToolUsage(tool);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Recording tool usage failed", error);
    return NextResponse.json({ error: "Something went wrong on our end." }, { status: 503 });
  }
}
