import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { verifyPassword } from "@/app/lib/auth/password";
import { generateToken, hashToken } from "@/app/lib/auth/tokens";
import { isValidEmail } from "@/app/lib/auth/validation";
import { getSession } from "@/app/lib/auth/session";
import { sendEmailChangeConfirmation, sendEmailChangeNotice } from "@/app/lib/email";
import { checkRateLimit } from "@/app/lib/rateLimit";

const EMAIL_CHANGE_TOKEN_TTL_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`change-email-request:${session.id}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
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

  const { newEmail, currentPassword } = (body ?? {}) as { newEmail?: unknown; currentPassword?: unknown };
  if (typeof newEmail !== "string" || typeof currentPassword !== "string") {
    return NextResponse.json({ error: "New email and current password are required." }, { status: 400 });
  }

  const emailError = isValidEmail(newEmail);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  const normalizedEmail = newEmail.trim().toLowerCase();
  if (normalizedEmail === session.email) {
    return NextResponse.json({ error: "That's already your email address." }, { status: 400 });
  }

  try {
    const rows = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [
      session.id,
    ]);
    const user = rows[0];
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const taken = await query<{ id: string }>("SELECT id FROM users WHERE email = $1 AND id != $2", [
      normalizedEmail,
      session.id,
    ]);
    if (taken[0]) {
      return NextResponse.json({ error: "That email address is already in use." }, { status: 409 });
    }

    const token = generateToken();
    await query(
      "INSERT INTO email_change_tokens (token_hash, user_id, new_email, expires_at) VALUES ($1, $2, $3, $4)",
      [hashToken(token), session.id, normalizedEmail, Date.now() + EMAIL_CHANGE_TOKEN_TTL_MS]
    );

    await sendEmailChangeConfirmation(normalizedEmail, token);
    await sendEmailChangeNotice(session.email, normalizedEmail);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Change email request failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
