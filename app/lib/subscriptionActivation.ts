import { query } from "@/app/lib/db";
import { disableSubscription, fetchSubscription, type Tier } from "@/app/lib/paystack";

interface ActivateInput {
  where: { id: string } | { email: string };
  tier: Tier;
  customerCode: string | null;
  subscriptionCode: string | null;
}

/**
 * Puts someone on a paid plan, and ends the plan they were paying for before so
 * an upgrade never bills them twice.
 *
 * Both the payment page and the Paystack webhook call this for the same
 * payment, in either order. The old subscription code is read in the same
 * statement that replaces it, so only the first caller sees the old one.
 */
export async function activateSubscription({ where, tier, customerCode, subscriptionCode }: ActivateInput) {
  const [column, value] = "id" in where ? ["id", where.id] : ["email", where.email];

  const rows = await query<{ old_code: string | null }>(
    `UPDATE users u
     SET plan = $1, subscription_status = 'active', plan_ends_at = NULL,
         paystack_customer_code = $2, paystack_subscription_code = $3
     FROM (SELECT id, paystack_subscription_code AS old_code FROM users WHERE ${column} = $4) prev
     WHERE u.id = prev.id
     RETURNING prev.old_code`,
    [tier, customerCode, subscriptionCode, value]
  );

  const oldCode = rows[0]?.old_code;
  if (!oldCode || oldCode === subscriptionCode) return;

  // The old plan is already replaced in our records. If stopping it fails the
  // person could be billed twice, so make that loud in the logs.
  try {
    const old = await fetchSubscription(oldCode);
    await disableSubscription(old.subscriptionCode, old.emailToken);
  } catch (error) {
    console.error(`UPGRADE: could not stop old subscription ${oldCode}; check Paystack so they aren't double billed`, error);
  }
}
