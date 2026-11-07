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
         paystack_customer_code = COALESCE($2, u.paystack_customer_code),
         paystack_subscription_code = COALESCE($3, u.paystack_subscription_code)
     FROM (SELECT id, paystack_subscription_code AS old_code FROM users WHERE ${column} = $4) prev
     WHERE u.id = prev.id
     RETURNING prev.old_code`,
    [tier, customerCode, subscriptionCode, value]
  );

  // Without a new code there is nothing to replace the old one with, so the
  // live subscription must be left alone.
  const oldCode = rows[0]?.old_code;
  if (!subscriptionCode || !oldCode || oldCode === subscriptionCode) return;

  // The old plan is already replaced in our records. If stopping it fails the
  // person could be billed twice, so make that loud in the logs.
  try {
    const old = await fetchSubscription(oldCode);
    await disableSubscription(old.subscriptionCode, old.emailToken);
  } catch (error) {
    console.error(`UPGRADE: could not stop old subscription ${oldCode}; check Paystack so they aren't double billed`, error);
  }
}

/**
 * Marks a payment reference as used. Returns true only for the first caller;
 * a second visit with the same reference gets false and must not activate.
 */
export async function claimPaymentReference(reference: string, userId: string): Promise<boolean> {
  const rows = await query<{ reference: string }>(
    `INSERT INTO paystack_references (reference, user_id, created_at) VALUES ($1, $2, $3)
     ON CONFLICT (reference) DO NOTHING RETURNING reference`,
    [reference, userId, Date.now()]
  );
  return rows.length > 0;
}

/** Gives a reference back, so a failed activation can be retried. */
export async function releasePaymentReference(reference: string): Promise<void> {
  await query("DELETE FROM paystack_references WHERE reference = $1", [reference]);
}
