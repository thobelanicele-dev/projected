import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth/session";
import { isValidUsername } from "@/app/lib/auth/validation";
import { checkRateLimit } from "@/app/lib/rateLimit";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const TAKEN = "That username is already taken.";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`change-username:${session.id}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
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

  const { username } = (body ?? {}) as { username?: unknown };
  if (typeof username !== "string") {
    return NextResponse.json({ error: "A new username is required." }, { status: 400 });
  }

  const next = username.trim();
  const usernameError = isValidUsername(next);
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 });
  }
  if (next === session.username) {
    return NextResponse.json({ error: "That's already your username." }, { status: 400 });
  }

  try {
    // Compared ignoring capitals, like signup, so "Alex" can't sit beside "alex".
    // Changing only the capitals of your own name is fine, hence the id check.
    const taken = await query<{ id: string }>(
      "SELECT id FROM users WHERE lower(username) = lower($1) AND id != $2",
      [next, session.id]
    );
    if (taken[0]) {
      return NextResponse.json({ error: TAKEN }, { status: 409 });
    }

    await query("UPDATE users SET username = $1 WHERE id = $2", [next, session.id]);
    return NextResponse.json({ ok: true, username: next });
  } catch (error) {
    // Two people claiming the same name at the same instant: the database's
    // unique rule stops the second one.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: TAKEN }, { status: 409 });
    }
    console.error("Change username failed", error);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 503 }
    );
  }
}
