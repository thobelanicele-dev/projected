import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_IDEA_LENGTH = 4000;

const tradePlanSchema = z.object({
  instrument: z
    .string()
    .describe("The instrument/pair being traded, e.g. EUR/USD, XAU/USD, BTC/USD"),
  direction: z.enum(["long", "short"]),
  entry: z.object({
    type: z.enum(["market", "limit", "stop"]),
    price: z.number().nullable(),
    condition: z.string().describe("Plain-English entry trigger/condition"),
    confirmation: z
      .string()
      .describe(
        "2-3 sentences on what a trader should actually see before pulling the trigger — e.g. candle close beyond the level, a retest, volume/momentum tells — so a beginner doesn't jump in on a fakeout."
      ),
  }),
  stopLoss: z.object({
    price: z.number().nullable(),
    reasoning: z.string().describe(
      "2-3 sentences explaining why this specific level was chosen (structure, volatility, round number, etc.), written so a beginner understands the logic, not just the number."
    ),
    invalidation: z
      .string()
      .describe(
        "1-2 sentences on what it means for the original thesis if this stop is hit — i.e. what was wrong about the idea, so the trader learns something from the loss rather than just taking it."
      ),
  }),
  takeProfits: z.array(
    z.object({
      price: z.number().nullable(),
      reasoning: z.string().describe(
        "2-3 sentences on why this target is realistic (prior structure, range, measured move, etc.) and what could cause price to fall short or overshoot it."
      ),
    })
  ),
  riskRewardRatio: z.number().nullable(),
  ruleChecks: z.array(
    z.object({
      rule: z.string(),
      passed: z.boolean(),
      note: z.string(),
    })
  ),
  biasFlags: z.array(
    z.object({
      flag: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      note: z.string(),
    })
  ),
  keyRisks: z
    .array(z.string())
    .describe(
      "2-4 concrete, trade-specific risks a beginner would likely overlook — e.g. upcoming news/economic releases, low-liquidity session timing, wide spread around this instrument, weekend gap risk, correlated exposure. Not generic disclaimers."
    ),
  watchFor: z
    .array(z.string())
    .describe(
      "2-4 concrete signals that would strengthen or confirm this setup before/while it plays out — the kind of checklist a mentor would tell a beginner to glance at."
    ),
  summary: z
    .string()
    .describe(
      "3-5 sentence overall verdict tying entry, risk, and thesis quality together — enough for a beginner to understand not just whether this trade is 'good' but why."
    ),
});

export type TradePlan = z.infer<typeof tradePlanSchema>;

const SYSTEM_PROMPT = `You are a disciplined trading mentor coaching a beginner — someone who may understand little or nothing about trading. Given their plain-English description of a trade idea, structure it into a precise, thorough trade plan: instrument, direction, entry, stop loss, and take profit levels. Extract numeric prices only when the trader specified them or they are clearly implied; otherwise use null and describe the condition in words.

Go deep on reasoning, not just numbers. For the entry, explain what should actually be observed before pulling the trigger (a confirmed break, a retest, a candle close) so the trader doesn't jump in on a fakeout. For the stop loss, explain the structural or logical reason for that exact level, and separately explain what it would mean for the original idea if that stop gets hit — so a loss becomes a lesson, not just a number. For each take profit, explain why that level is realistic and what could make price fall short or run past it. Write these as 2-3 real, specific sentences each — grounded in the trade's own details, not generic boilerplate.

Then run a rule-set check against standard risk-management practices (defined stop loss, defined position size or risk %, favorable risk:reward, no averaging into losers, clear invalidation level) and mark each as passed or failed based on the idea as described.

Then flag any cognitive/behavioral biases evident in the idea's phrasing (e.g. revenge trading, FOMO/chasing, overconfidence, confirmation bias, no stop loss, moving the goalposts, oversized position, ignoring higher timeframe context). Only include a bias flag if there is real evidence for it in the text — do not invent flags that aren't supported.

Also surface concrete, trade-specific key risks a beginner would likely overlook (e.g. news/economic releases due, thin liquidity in this session, wide typical spread on this instrument, weekend gap risk) — not generic disclaimers. And list concrete signals worth watching for that would confirm or strengthen the setup, like a checklist a mentor would point out.

Write the final summary as a short verdict paragraph that ties entry quality, risk discipline, and thesis strength together in a way a beginner can actually learn from.

If the trader's message includes real market data (a current price, a recent high/low range, or upcoming economic events), ground your reasoning in those actual numbers — reference them directly rather than inventing separate figures. If no such data is given for something, discuss it qualitatively (e.g. "recent structure suggests...") rather than fabricating a specific price or level you have no evidence for. Never state a specific technical level (a swing high, a support/resistance price, a range boundary) unless it was given to you or the trader specified it themselves.

This is not financial advice — you are structuring the trader's own idea and coaching them on risk discipline and process, not predicting market direction.`;

export async function POST(req: NextRequest) {
  let idea: unknown;
  try {
    ({ idea } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof idea !== "string" || !idea.trim()) {
    return NextResponse.json({ error: "Trade idea is required." }, { status: 400 });
  }

  if (idea.length > MAX_IDEA_LENGTH) {
    return NextResponse.json(
      { error: `Trade idea must be ${MAX_IDEA_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const rateLimit = checkRateLimit(`plan:${getClientIp(req)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many trade plan requests. Please wait a bit before trying again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-5"),
      schema: tradePlanSchema,
      system: SYSTEM_PROMPT,
      prompt: idea,
    });

    return NextResponse.json({ plan: object });
  } catch (error) {
    console.error("Trade plan generation failed", error);
    return NextResponse.json(
      { error: "Failed to generate trade plan. Please try again." },
      { status: 500 }
    );
  }
}
