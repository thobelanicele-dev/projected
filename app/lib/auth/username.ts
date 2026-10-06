import { isValidUsername } from "@/app/lib/auth/validation";

/** Strips an email local-part down to a candidate that can start a valid username. */
function sanitizeBase(localPart: string): string {
  let base = localPart.replace(/[^a-zA-Z0-9_]/g, "");
  base = base.replace(/^[^a-zA-Z]+/, "");
  if (!base) base = "user";
  return base.slice(0, 15); // leaves room for a "_" + 4-digit suffix under the 20-char cap
}

/**
 * Derives a username from an email address for OAuth signups, where no
 * username is supplied. Retries with a random numeric suffix until `isTaken`
 * reports a free one. Always re-validated through the real `isValidUsername`
 * rule rather than a duplicated regex, so it can't drift out of sync with it.
 */
export async function generateUsernameFromEmail(
  email: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  const localPart = email.split("@")[0] ?? "";
  const base = sanitizeBase(localPart);

  if (isValidUsername(base) === null && !(await isTaken(base))) {
    return base;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${base}_${suffix}`.slice(0, 20);
    if (isValidUsername(candidate) === null && !(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique username.");
}
