import { query } from "@/app/lib/db";

/**
 * Cancels every pending password-reset and email-change link for a user.
 * Called when a credential changes (password reset, password change, email
 * change), so a link issued earlier, possibly by someone who had a stolen
 * session or a copy of an old email, can't be used afterwards.
 */
export async function revokePendingRecoveryTokens(userId: string): Promise<void> {
  await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
  await query("DELETE FROM email_change_tokens WHERE user_id = $1", [userId]);
}
