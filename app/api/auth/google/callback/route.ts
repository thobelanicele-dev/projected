import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { query } from "@/app/lib/db";
import { createSession } from "@/app/lib/auth/session";
import { generateUsernameFromEmail } from "@/app/lib/auth/username";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";
import {
  oauth,
  getGoogleAuthServer,
  getGoogleClient,
  getGoogleClientAuth,
  getGoogleRedirectUri,
  GOOGLE_OAUTH_COOKIE,
} from "@/app/lib/auth/google";

const RATE_LIMIT = 15;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function errorRedirect(req: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
}

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(`google-callback:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return errorRedirect(req, "google-rate-limited");
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_COOKIE); // one-time use, clear regardless of outcome

  if (!raw) return errorRedirect(req, "google-session-expired");

  let stored: { state: string; codeVerifier: string; nonce: string };
  try {
    stored = JSON.parse(raw);
  } catch {
    return errorRedirect(req, "google-session-expired");
  }

  const as = await getGoogleAuthServer();
  const client = getGoogleClient();

  let params: URLSearchParams;
  try {
    // Pass a plain URLSearchParams rather than req.nextUrl: NextURL is a
    // URL subclass, but oauth4webapi's own `instanceof URL` check doesn't
    // reliably recognize it across the Next.js runtime's module realm.
    params = oauth.validateAuthResponse(as, client, req.nextUrl.searchParams, stored.state);
  } catch (error) {
    if (error instanceof oauth.AuthorizationResponseError && error.error === "access_denied") {
      return errorRedirect(req, "google-denied");
    }
    console.error("Google OAuth callback rejected", error);
    return errorRedirect(req, "google-auth-failed");
  }

  let claims: oauth.IDToken | undefined;
  try {
    const tokenResponse = await oauth.authorizationCodeGrantRequest(
      as,
      client,
      getGoogleClientAuth(),
      params,
      getGoogleRedirectUri(),
      stored.codeVerifier
    );
    const result = await oauth.processAuthorizationCodeResponse(as, client, tokenResponse, {
      expectedNonce: stored.nonce,
      requireIdToken: true,
    });
    claims = oauth.getValidatedIdTokenClaims(result);
  } catch (error) {
    console.error("Google OAuth token exchange failed", error);
    return errorRedirect(req, "google-auth-failed");
  }

  if (!claims || typeof claims.sub !== "string" || typeof claims.email !== "string") {
    return errorRedirect(req, "google-auth-failed");
  }

  if (claims.email_verified !== true) {
    return errorRedirect(req, "google-email-unverified");
  }

  const providerAccountId = claims.sub;
  const normalizedEmail = claims.email.trim().toLowerCase();
  const now = Date.now();

  try {
    const linked = await query<{ user_id: string }>(
      "SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_account_id = $1",
      [providerAccountId]
    );

    let userId = linked[0]?.user_id;

    if (!userId) {
      const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [
        normalizedEmail,
      ]);

      if (existing[0]) {
        // Auto-link: Google already proved ownership of this email, so no
        // separate "merge your account" confirmation step is needed.
        userId = existing[0].id;
        await query(
          "UPDATE users SET email_verified = TRUE WHERE id = $1 AND email_verified = FALSE",
          [userId]
        );
      } else {
        userId = randomUUID();
        const username = await generateUsernameFromEmail(normalizedEmail, async (candidate) => {
          const rows = await query<{ id: string }>("SELECT id FROM users WHERE username = $1", [
            candidate,
          ]);
          return rows.length > 0;
        });

        await query(
          `INSERT INTO users (id, email, username, password_hash, email_verified, created_at)
           VALUES ($1, $2, $3, NULL, TRUE, $4)`,
          [userId, normalizedEmail, username, now]
        );
      }

      await query(
        `INSERT INTO oauth_accounts (provider, provider_account_id, user_id, email, created_at)
         VALUES ('google', $1, $2, $3, $4)`,
        [providerAccountId, userId, normalizedEmail, now]
      );
    }

    await createSession(userId);
    return NextResponse.redirect(new URL("/planner", req.url));
  } catch (error) {
    console.error("Google OAuth sign-in failed", error);
    return errorRedirect(req, "google-auth-failed");
  }
}
