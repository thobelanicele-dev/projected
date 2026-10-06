const MESSAGES: Record<string, string> = {
  "google-denied": "Google sign-in was cancelled.",
  "google-email-unverified":
    "Your Google account's email isn't verified. Please verify it with Google and try again.",
  "google-session-expired": "That Google sign-in link expired. Please try again.",
  "google-rate-limited": "Too many attempts. Please try again in a few minutes.",
  "google-auth-failed": "Something went wrong signing in with Google. Please try again.",
};

/** Maps a `?error=` query param from the Google OAuth callback to a readable message. */
export function googleErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? null;
}
