import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";
import {
  oauth,
  getGoogleAuthServer,
  getGoogleClient,
  getGoogleRedirectUri,
  GOOGLE_OAUTH_COOKIE,
} from "@/app/lib/auth/google";

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Redirects to Google's consent screen. Started from a plain link, not fetch. */
export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(`google-start:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.redirect(new URL("/login?error=google-rate-limited", req.url));
  }

  const as = await getGoogleAuthServer();
  const client = getGoogleClient();

  const state = oauth.generateRandomState();
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  const nonce = oauth.generateRandomNonce();

  const url = new URL(as.authorization_endpoint!);
  url.searchParams.set("client_id", client.client_id);
  url.searchParams.set("redirect_uri", getGoogleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_COOKIE, JSON.stringify({ state, codeVerifier, nonce }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600, // 10 minutes: just long enough to complete the consent screen
  });

  return NextResponse.redirect(url);
}
