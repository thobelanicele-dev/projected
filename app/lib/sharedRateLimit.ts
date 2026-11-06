import { query } from "@/app/lib/db";
import { checkRateLimit, type RateLimitResult } from "@/app/lib/rateLimit";
import { RATE_LIMITS_TABLE_SQL } from "@/app/lib/rateLimitSchema";

export { RATE_LIMITS_TABLE_SQL };

// A rate limiter whose counts live in the database, so every server instance
// sees the same numbers. The in-memory one in rateLimit.ts keeps separate counts
// per instance, which on serverless hosting lets an attacker spread guesses
// across instances. Use this one for the routes where that matters: login,
// signup, and the emails that reset or verify an account.


// One statement does the whole check, so two requests at the same instant can't
// both read the old count: it starts a fresh window if the old one has ended,
// otherwise adds one, and hands back where that leaves things.
const HIT_SQL = `
  INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $2, 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN rate_limits.window_start + $3 <= $2 THEN 1 ELSE rate_limits.count + 1 END,
    window_start = CASE WHEN rate_limits.window_start + $3 <= $2 THEN $2 ELSE rate_limits.window_start END
  RETURNING count, window_start
`;

const CLEANUP_SQL = `DELETE FROM rate_limits WHERE window_start < $1`;
const CLEANUP_CHANCE = 0.01;
const KEEP_MS = 24 * 60 * 60 * 1000;

export async function checkSharedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): Promise<RateLimitResult> {
  try {
    const rows = await query<{ count: number; window_start: string }>(HIT_SQL, [key, now, windowMs]);
    const { count, window_start } = rows[0];

    // Tidy up old rows now and then so the table doesn't grow forever.
    if (Math.random() < CLEANUP_CHANCE) {
      query(CLEANUP_SQL, [now - KEEP_MS]).catch(() => {});
    }

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((Number(window_start) + windowMs - now) / 1000)),
      };
    }
    return { allowed: true, remaining: limit - count, retryAfterSeconds: 0 };
  } catch (error) {
    // If the database hiccups, fall back to the per-instance limiter rather than
    // letting everyone in, or locking everyone out.
    console.error("Shared rate limit failed; using the in-memory one", error);
    return checkRateLimit(key, limit, windowMs);
  }
}
