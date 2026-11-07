import { query } from "@/app/lib/db";

/**
 * Called when Google has just proved someone owns the email of an account that
 * already exists. If that account was never verified, whoever created it may
 * not be the owner (anyone can sign up with an email they don't own), so the
 * password they chose is thrown away along with anything else they could still
 * use: sessions and pending verification links. The real owner keeps access
 * through Google, or can set a password with "forgot password".
 *
 * An already verified account is left exactly as it was.
 */
export async function claimUnverifiedAccountForGoogle(userId: string): Promise<void> {
  const claimed = await query<{ id: string }>(
    `UPDATE users SET email_verified = TRUE, password_hash = NULL
     WHERE id = $1 AND email_verified = FALSE
     RETURNING id`,
    [userId]
  );
  if (!claimed[0]) return;

  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
  await query("DELETE FROM email_verification_tokens WHERE user_id = $1", [userId]);
  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
}
