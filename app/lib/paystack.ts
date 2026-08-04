import { createHmac, timingSafeEqual } from "node:crypto";

export type Tier = "basic" | "plus" | "premium";

export const PLAN_CODES: Record<Tier, string> = {
  basic: "PLN_1vx17of5krdrwfs",
  plus: "PLN_ublvsjo80pbvruj",
  premium: "PLN_i8srkkv48npz3bu",
};

const TIER_BY_PLAN_CODE: Record<string, Tier> = Object.fromEntries(
  Object.entries(PLAN_CODES).map(([tier, code]) => [code, tier as Tier])
);

export function tierForPlanCode(planCode: string): Tier | null {
  return TIER_BY_PLAN_CODE[planCode] ?? null;
}

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && value in PLAN_CODES;
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not set. Add it to .env.local.");
  }
  return key;
}

interface InitializeResult {
  authorizationUrl: string;
  reference: string;
}

async function getPlanAmount(planCode: string): Promise<number> {
  const res = await fetch(`https://api.paystack.co/plan/${encodeURIComponent(planCode)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Failed to look up Paystack plan.");
  }
  return data.data.amount;
}

export async function initializeTransaction(
  email: string,
  planCode: string,
  callbackUrl: string
): Promise<InitializeResult> {
  // Paystack requires `amount` on this endpoint even when a recurring `plan`
  // is supplied — the plan itself still governs what actually gets charged
  // and on what schedule, this just satisfies the endpoint's validation.
  const amount = await getPlanAmount(planCode);

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, amount, plan: planCode, callback_url: callbackUrl }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Failed to initialize Paystack transaction.");
  }

  return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
}

export interface VerifyResult {
  success: boolean;
  email: string | null;
  planCode: string | null;
  customerCode: string | null;
  subscriptionCode: string | null;
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    return { success: false, email: null, planCode: null, customerCode: null, subscriptionCode: null };
  }

  const tx = data.data;
  return {
    success: tx.status === "success",
    email: tx.customer?.email ?? null,
    planCode: tx.plan?.plan_code ?? tx.plan ?? null,
    customerCode: tx.customer?.customer_code ?? null,
    subscriptionCode: tx.subscription_code ?? tx.subscription?.subscription_code ?? null,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
