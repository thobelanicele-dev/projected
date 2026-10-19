import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { activateSubscription } from "@/app/lib/subscriptionActivation";
import { parseDate, tierForPlanCode, verifyWebhookSignature } from "@/app/lib/paystack";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { event: eventType, data } = (event ?? {}) as { event?: string; data?: Record<string, unknown> };

  try {
    if (eventType === "subscription.create" && data) {
      const planCode = (data.plan as { plan_code?: string })?.plan_code;
      const email = (data.customer as { email?: string })?.email;
      const customerCode = (data.customer as { customer_code?: string })?.customer_code;
      const subscriptionCode = data.subscription_code as string | undefined;
      const tier = planCode ? tierForPlanCode(planCode) : null;

      if (tier && email) {
        await activateSubscription({
          where: { email },
          tier,
          customerCode: customerCode ?? null,
          subscriptionCode: subscriptionCode ?? null,
        });
      }
    } else if (eventType === "subscription.disable" && data) {
      const subscriptionCode = data.subscription_code as string | undefined;
      if (subscriptionCode) {
        // Cancelling stops renewal, but they've paid through the end of the
        // current period. Keep access until then; only drop to 'cancelled'
        // when there's no future end date to honor. The cancel button records
        // the end date itself; a cancel done from Paystack's own dashboard
        // falls back to the date in this event.
        const eventEnd = parseDate(data.next_payment_date);
        await query(
          `UPDATE users
           SET plan_ends_at = COALESCE(plan_ends_at, $3),
               subscription_status = CASE WHEN COALESCE(plan_ends_at, $3) > $2 THEN 'cancelling' ELSE 'cancelled' END
           WHERE paystack_subscription_code = $1`,
          [subscriptionCode, Date.now(), eventEnd]
        );
      }
    } else if (eventType === "charge.success" && data) {
      const email = (data.customer as { email?: string })?.email;
      const planCode = (data.plan as { plan_code?: string } | string | undefined) as
        | { plan_code?: string }
        | string
        | undefined;
      const resolvedPlanCode = typeof planCode === "string" ? planCode : planCode?.plan_code;

      if (email && resolvedPlanCode) {
        // Never let a late-arriving payment event undo a cancellation that
        // still has paid time left on it.
        await query(
          `UPDATE users SET subscription_status = 'active'
           WHERE email = $1
             AND NOT (subscription_status = 'cancelling' AND COALESCE(plan_ends_at, 0) > $2)`,
          [email, Date.now()]
        );
      }
    }
  } catch (error) {
    console.error("Paystack webhook handling failed", error);
  }

  return NextResponse.json({ received: true });
}
