import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { verifyPassword } from "@/app/lib/auth/password";
import { createSession } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// A syntactically valid salt:hash placeholder, so a login attempt against an
// unknown email still runs a full scrypt comparison — keeps response timing
// close to the real-account case instead of returning early and cheap.
const DUMMY_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`login:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rows = await query<{ id: string; password_hash: string; email_verified: boolean }>(
    "SELECT id, password_hash, email_verified FROM users WHERE email = $1",
    [normalizedEmail]
  );
  const user = rows[0];

  const passwordOk = verifyPassword(password, user?.password_hash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  if (!user.email_verified) {
    return NextResponse.json(
      { error: "Please verify your email before logging in." },
      { status: 403 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
