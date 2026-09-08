import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { query } from "@/app/lib/db";
import { hashPassword } from "@/app/lib/auth/password";
import { generateToken, hashToken } from "@/app/lib/auth/tokens";
import { isValidEmail, isValidPassword, isValidUsername } from "@/app/lib/auth/validation";
import { sendVerificationEmail } from "@/app/lib/email";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`signup:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, username, password } = (body ?? {}) as {
    email?: unknown;
    username?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email, username, and password are required." }, { status: 400 });
  }

  const emailError = isValidEmail(email);
  if (emailError) return NextResponse.json({ error: emailError }, { status: 400 });

  const usernameError = isValidUsername(username);
  if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });

  const passwordError = isValidPassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingRows = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [normalizedEmail, username]
    );

    if (existingRows[0]) {
      return NextResponse.json({ error: "Email or username is already in use." }, { status: 409 });
    }

    const userId = randomUUID();
    const passwordHash = hashPassword(password);
    const now = Date.now();

    await query(
      "INSERT INTO users (id, email, username, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)",
      [userId, normalizedEmail, username, passwordHash, now]
    );

    const token = generateToken();
    await query(
      "INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [hashToken(token), userId, now + VERIFICATION_TOKEN_TTL_MS]
    );

    await sendVerificationEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
