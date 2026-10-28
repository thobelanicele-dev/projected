// Complimentary Premium access for specific people (the owner, testers, friends),
// without a Paystack subscription. Set PREMIUM_ACCESS_EMAILS to a comma-separated
// list of addresses; remove an address from the list to take the access away.
//
// It's applied when the session is read, so everything that already asks "what
// plan is this person on?" (limits, history depth, the upgrade screens) sees
// Premium without any of it needing to know about this list.

/** The addresses on the list, lower-cased. */
export function compedEmails(value: string | undefined = process.env.PREMIUM_ACCESS_EMAILS): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Whether this account gets complimentary Premium. The email must be verified,
 * so nobody can claim someone else's address by signing up with it.
 */
export function isComped(
  user: { email: string; emailVerified: boolean },
  value: string | undefined = process.env.PREMIUM_ACCESS_EMAILS
): boolean {
  return user.emailVerified && compedEmails(value).has(user.email.trim().toLowerCase());
}

/** Returns the same user, upgraded to Premium if they're on the list. */
export function withCompedAccess<
  T extends { email: string; emailVerified: boolean; plan: string | null; subscriptionStatus: string | null; planEndsAt: number | null }
>(user: T, value?: string): T & { complimentary: boolean } {
  if (!isComped(user, value)) return { ...user, complimentary: false };
  return { ...user, plan: "premium", subscriptionStatus: "active", planEndsAt: null, complimentary: true };
}
