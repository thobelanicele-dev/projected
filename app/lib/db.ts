import { Pool, type QueryResultRow } from "pg";
import { hashToken } from "@/app/lib/auth/tokens";

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __pgMigration?: Promise<void>;
};

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase Postgres connection string to .env.local " +
        "(Project Settings → Database → Connection string, Transaction pooler mode)."
    );
  }

  // Supabase's pooler generally presents a publicly-trusted certificate, so
  // strict verification (the safer default) usually works — but flipping
  // this blind against a live production database, with no way to test it
  // here first, risks breaking every DB call at once if it doesn't. Set
  // DATABASE_SSL_STRICT=true once you've confirmed it connects cleanly.
  const strictSsl = process.env.DATABASE_SSL_STRICT === "true";

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: strictSsl ? true : { rejectUnauthorized: false },
  });
}

function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = createPool();
  }
  return globalForDb.__pgPool;
}

async function migrate(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      expires_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      expires_at BIGINT NOT NULL
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;

    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
  `);

  // One-time backfill: sessions used to store the raw session token directly
  // as their id (readable in plain text by anyone with DB access). Existing
  // rows still have that raw token in `id` — hash it into the new column so
  // lookups can move to the hash without invalidating anyone's login. New
  // sessions (see auth/session.ts) never populate `id` with the raw token.
  const unbackfilled = await pool.query<{ id: string }>(
    "SELECT id FROM sessions WHERE token_hash IS NULL"
  );
  for (const row of unbackfilled.rows) {
    await pool.query("UPDATE sessions SET token_hash = $1 WHERE id = $2", [
      hashToken(row.id),
      row.id,
    ]);
  }
}

function ensureMigrated(): Promise<void> {
  if (!globalForDb.__pgMigration) {
    globalForDb.__pgMigration = migrate();
  }
  return globalForDb.__pgMigration;
}

/** Runs a parameterized query against the auth database, migrating on first use. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureMigrated();
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
