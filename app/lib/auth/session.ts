import { cookies } from "next/headers";
import { query } from "@/app/lib/db";
import { generateToken } from "@/app/lib/auth/tokens";

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

  await query(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [token, userId, now + SESSION_DURATION_MS, now]
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
     WHERE sessions.id = $1`,
    [token]
  );
  const row = rows[0];

  if (!row) return null;
  if (Number(row.expires_at) <= Date.now()) {
    await query("DELETE FROM sessions WHERE id = $1", [token]);
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
    await query("DELETE FROM sessions WHERE id = $1", [token]);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Deletes every session belonging to a user — used on password reset. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}
