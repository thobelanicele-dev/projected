// The table behind the shared (database-backed) rate limiter. Kept in its own
// file, with no imports, so both the schema setup in db.ts and the limiter can
// use it without importing each other.
export const RATE_LIMITS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    window_start BIGINT NOT NULL,
    count INTEGER NOT NULL
  );
`;
