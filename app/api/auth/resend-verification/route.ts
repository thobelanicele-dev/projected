import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { generateToken, hashToken } from "@/app/lib/auth/tokens";
import { isValidEmail } from "@/app/lib/auth/validation";
import { sendVerificationEmail } from "@/app/lib/email";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`resend-verification:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: unknown };
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const emailError = isValidEmail(email);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  // Always respond the same way whether or not the account exists, or is
  // already verified — same email-enumeration-prevention boundary as
  // reset-password/request.
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await query<{ id: string; email_verified: boolean }>(
    "SELECT id, email_verified FROM users WHERE email = $1",
    [normalizedEmail]
  );
  const user = rows[0];

  if (user && !user.email_verified) {
    const token = generateToken();
    await query(
      "INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [hashToken(token), user.id, Date.now() + VERIFICATION_TOKEN_TTL_MS]
    );
    await sendVerificationEmail(normalizedEmail, token);
  }

  return NextResponse.json({ ok: true });
}
