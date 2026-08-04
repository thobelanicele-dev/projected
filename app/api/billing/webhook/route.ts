import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { tierForPlanCode, verifyWebhookSignature } from "@/app/lib/paystack";

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
        await query(
          `UPDATE users
           SET plan = $1, subscription_status = 'active', paystack_customer_code = $2, paystack_subscription_code = $3
           WHERE email = $4`,
          [tier, customerCode ?? null, subscriptionCode ?? null, email]
        );
      }
    } else if (eventType === "subscription.disable" && data) {
      const subscriptionCode = data.subscription_code as string | undefined;
      if (subscriptionCode) {
        await query(
          "UPDATE users SET subscription_status = 'cancelled' WHERE paystack_subscription_code = $1",
          [subscriptionCode]
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
        await query(
          "UPDATE users SET subscription_status = 'active' WHERE email = $1",
          [email]
        );
      }
    }
  } catch (error) {
    console.error("Paystack webhook handling failed", error);
  }

  return NextResponse.json({ received: true });
}
