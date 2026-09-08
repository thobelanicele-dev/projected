import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/app/lib/db";
import { generateToken, hashToken } from "@/app/lib/auth/tokens";

export const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
}

/** Creates a session row and sets the cookie. Route Handlers only. */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const now = Date.now();

  // The raw token is only ever kept in the httpOnly cookie. The database
  // stores a SHA-256 hash of it (like every other token in this app) and a
  // separate random row id — so reading the sessions table alone is never
  // enough to impersonate a logged-in user.
  await query(
    "INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), hashToken(token), userId, now + SESSION_DURATION_MS, now]
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

/** Reads the session cookie and returns the logged-in user, or null. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await query<{
    id: string;
    email: string;
    username: string;
    email_verified: boolean;
    plan: string | null;
    subscription_status: string | null;
    expires_at: string;
  }>(
    `SELECT users.id, users.email, users.username, users.email_verified, users.plan,
            users.subscription_status, sessions.expires_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];

  if (!row) return null;
  if (Number(row.expires_at) <= Date.now()) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    emailVerified: row.email_verified,
    plan: row.plan,
    subscriptionStatus: row.subscription_status,
  };
}

/** Destroys the current session and clears the cookie. Route Handlers only. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Deletes every session belonging to a user — used on password reset. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}
