// One row per user, per metric, per calendar month. Kept separate from db.ts so
// the exact SQL that enforces the limits can also be run against a real
// Postgres engine in tests.
export const USAGE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS usage_counts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    period TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, metric, period)
  );
`;

// Check-and-increment in a single statement so two requests at the same moment
// can't both slip under the cap. When the cap is already reached the UPDATE's
// WHERE clause fails and no row comes back.
export const CONSUME_SQL = `
  INSERT INTO usage_counts (user_id, metric, period, count)
  VALUES ($1, $2, $3, 1)
  ON CONFLICT (user_id, metric, period)
  DO UPDATE SET count = usage_counts.count + 1
  WHERE usage_counts.count < $4
  RETURNING count
`;

export const REFUND_SQL = `
  UPDATE usage_counts SET count = GREATEST(count - 1, 0)
  WHERE user_id = $1 AND metric = $2 AND period = $3
`;

export const READ_USAGE_SQL = `
  SELECT metric, count FROM usage_counts WHERE user_id = $1 AND period = $2
`;
