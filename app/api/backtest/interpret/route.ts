import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 2000;

const strategySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ma_crossover"),
    fastPeriod: z.number().int().min(2).max(100),
    slowPeriod: z.number().int().min(3).max(300),
    maKind: z.enum(["sma", "ema"]),
  }),
  z.object({
    type: z.literal("breakout"),
    lookbackDays: z.number().int().min(2).max(200),
  }),
  z.object({
    type: z.literal("rsi"),
    period: z.number().int().min(2).max(50),
    oversold: z.number().min(1).max(49),
    overbought: z.number().min(51).max(99),
  }),
]);

const responseSchema = z.object({
  strategy: strategySchema,
  stopLossPct: z.number().min(0.1).max(50),
  takeProfitPct: z.number().min(0.1).max(100),
  explanation: z
    .string()
    .describe(
      "Plain-English restatement of how the free-text description was mapped onto this structured strategy, including any assumptions made for unspecified parameters, so the trader can confirm it matches their intent before running."
    ),
});

const SYSTEM_PROMPT = `You are mapping a trader's plain-English strategy description onto one of exactly three supported, precisely-defined backtest templates. You must pick the single closest-matching template and fill in its parameters — you cannot invent a new strategy type or run logic outside these three.

1. ma_crossover — enter long when a faster moving average crosses above a slower one, short when it crosses below. Params: fastPeriod, slowPeriod, maKind (sma or ema).
2. breakout — enter long when price closes above the highest high of the last N days, short when it closes below the lowest low. Params: lookbackDays.
3. rsi — enter long when RSI crosses down into an oversold zone, short when it crosses up into an overbought zone. Params: period, oversold, overbought.

Also infer a stop-loss percentage and take-profit percentage from the description if mentioned (e.g. "risk 2%, target 6%" or "1:3 risk reward"). If not mentioned, use conservative defaults (stopLossPct: 2, takeProfitPct: 6).

If the description doesn't map cleanly onto one of these three templates, pick whichever is the closest conceptual match and clearly say so in the explanation — do not silently guess without flagging the mismatch. Be explicit in the explanation about every parameter you had to assume rather than read directly from the description, so the trader can correct anything that's wrong before running the backtest.`;

export async function POST(req: NextRequest) {
  let description: unknown;
  try {
    ({ description } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "A strategy description is required." }, { status: 400 });
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Strategy description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const rateLimit = checkRateLimit(
    `interpret:${getClientIp(req)}`,
    RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many interpret requests. Please wait a bit before trying again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-5"),
      schema: responseSchema,
      system: SYSTEM_PROMPT,
      prompt: description,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Strategy interpretation failed", error);
    return NextResponse.json(
      { error: "Failed to interpret strategy. Please try again or use a template instead." },
      { status: 500 }
    );
  }
}
