import { query } from "@/app/lib/db";
import { FIRST_N_COUNT } from "@/app/lib/betaRewardConfig";

export { FIRST_N_COUNT };

// "First N signups" is a stable historical fact once N accounts exist, so
// it's just queried live rather than stored as a flag anywhere.
export async function getFirstFiveUserIds(): Promise<string[]> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM users ORDER BY created_at ASC LIMIT $1",
    [FIRST_N_COUNT]
  );
  return rows.map((r) => r.id);
}

export async function isInFirstFive(userId: string): Promise<boolean> {
  const ids = await getFirstFiveUserIds();
  return ids.includes(userId);
}

export async function hasUsedAnyTool(userId: string): Promise<boolean> {
  const rows = await query("SELECT 1 FROM user_tool_usage WHERE user_id = $1 LIMIT 1", [userId]);
  return rows.length > 0;
}

export async function getReview(userId: string): Promise<{ rating: number; body: string } | null> {
  const rows = await query<{ rating: number; body: string }>(
    "SELECT rating, body FROM beta_reviews WHERE user_id = $1",
    [userId]
  );
  return rows[0] ?? null;
}

export async function submitReview(userId: string, rating: number, body: string): Promise<void> {
  await query(
    `INSERT INTO beta_reviews (user_id, rating, body, created_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, rating, body, Date.now()]
  );
}
