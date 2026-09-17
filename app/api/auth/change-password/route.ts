import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { hashPassword, verifyPassword } from "@/app/lib/auth/password";
import { isValidPassword } from "@/app/lib/auth/validation";
import { getSession, getCurrentSessionTokenHash, destroyOtherSessionsForUser } from "@/app/lib/auth/session";
import { checkRateLimit } from "@/app/lib/rateLimit";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`change-password:${session.id}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
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

  const { currentPassword, newPassword } = (body ?? {}) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  const passwordError = isValidPassword(newPassword);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const rows = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [
      session.id,
    ]);
    const user = rows[0];
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashPassword(newPassword), session.id]);

    const currentTokenHash = await getCurrentSessionTokenHash();
    if (currentTokenHash) {
      await destroyOtherSessionsForUser(session.id, currentTokenHash);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Change password failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
