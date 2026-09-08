import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { hashToken } from "@/app/lib/auth/tokens";
import { hashPassword } from "@/app/lib/auth/password";
import { isValidPassword } from "@/app/lib/auth/validation";
import { destroyAllSessionsForUser } from "@/app/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`reset-confirm:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
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

  const { token, password } = (body ?? {}) as { token?: unknown; password?: unknown };
  if (typeof token !== "string" || !token || typeof password !== "string") {
    return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
  }

  const passwordError = isValidPassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const tokenHash = hashToken(token);

  try {
    const rows = await query<{ user_id: string; expires_at: string }>(
      "SELECT user_id, expires_at FROM password_reset_tokens WHERE token_hash = $1",
      [tokenHash]
    );
    const row = rows[0];

    if (!row || Number(row.expires_at) <= Date.now()) {
      await query("DELETE FROM password_reset_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      hashPassword(password),
      row.user_id,
    ]);
    await query("DELETE FROM password_reset_tokens WHERE token_hash = $1", [tokenHash]);
    await destroyAllSessionsForUser(row.user_id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset confirm failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
