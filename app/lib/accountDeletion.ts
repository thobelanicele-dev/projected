export type Run = (text: string, params?: unknown[]) => Promise<unknown[]>;

// Older versions of the app created these two tables with a link to users and
// no "delete along with the user" rule. They were later dropped from the code
// but not from the live database, so a user with a row in either would make
// the final delete fail. They only exist in databases that ever had them.
const LEGACY_USER_TABLES = ["user_tool_usage", "beta_reviews"];

/**
 * Removes a user and everything tied to them. Pass a runner that is inside a
 * transaction so a failure part-way leaves the account completely untouched.
 */
export async function deleteUserData(run: Run, userId: string): Promise<void> {
  await run("DELETE FROM sessions WHERE user_id = $1", [userId]);
  await run("DELETE FROM email_verification_tokens WHERE user_id = $1", [userId]);
  await run("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
  await run("DELETE FROM email_change_tokens WHERE user_id = $1", [userId]);
  await run("DELETE FROM oauth_accounts WHERE user_id = $1", [userId]);
  await run("DELETE FROM paystack_references WHERE user_id = $1", [userId]);

  for (const table of LEGACY_USER_TABLES) {
    const found = (await run("SELECT to_regclass($1) AS name", [table])) as { name: string | null }[];
    if (found[0]?.name) await run(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }

  await run("DELETE FROM users WHERE id = $1", [userId]);
}
