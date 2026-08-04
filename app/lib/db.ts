import { Pool, type QueryResultRow } from "pg";

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

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = createPool();
  }
  return globalForDb.__pgPool;
}

function migrate(): Promise<void> {
  return getPool()
    .query(
      `
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
    `
    )
    .then(() => undefined);
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
