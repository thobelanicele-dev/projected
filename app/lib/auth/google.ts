import * as oauth from "oauth4webapi";

const GOOGLE_ISSUER = new URL("https://accounts.google.com");

const globalForGoogle = globalThis as unknown as {
  __googleAuthServer?: Promise<oauth.AuthorizationServer>;
};

/** Google's OIDC discovery document, fetched once per process and cached. */
function getGoogleAuthServer(): Promise<oauth.AuthorizationServer> {
  if (!globalForGoogle.__googleAuthServer) {
    globalForGoogle.__googleAuthServer = oauth
      .discoveryRequest(GOOGLE_ISSUER)
      .then((response) => oauth.processDiscoveryResponse(GOOGLE_ISSUER, response));
  }
  return globalForGoogle.__googleAuthServer;
}

function getGoogleClient(): oauth.Client {
  return { client_id: requireEnv("GOOGLE_CLIENT_ID") };
}

function getGoogleClientAuth(): oauth.ClientAuth {
  return oauth.ClientSecretPost(requireEnv("GOOGLE_CLIENT_SECRET"));
}

function requireEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export function getGoogleRedirectUri(): string {
  return `${process.env.APP_URL}/api/auth/google/callback`;
}

/** Short-lived cookie carrying the PKCE verifier + state + nonce between the two OAuth routes. */
export const GOOGLE_OAUTH_COOKIE = "google_oauth";

export { oauth, getGoogleAuthServer, getGoogleClient, getGoogleClientAuth };
