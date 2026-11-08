import { beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { deleteUserData } from "@/app/lib/accountDeletion";

const USER = "00000000-0000-0000-0000-0000000000c1";
const OTHER = "00000000-0000-0000-0000-0000000000c2";

let db: PGlite;
const run = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows;
const count = async (table: string, id: string) =>
  Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} WHERE user_id = $1`, [id])).rows[0].n);

async function schema(withLegacy: boolean) {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE users (id UUID PRIMARY KEY);
    CREATE TABLE sessions (id TEXT, user_id UUID REFERENCES users(id));
    CREATE TABLE email_verification_tokens (token_hash TEXT, user_id UUID REFERENCES users(id));
    CREATE TABLE password_reset_tokens (token_hash TEXT, user_id UUID REFERENCES users(id));
    CREATE TABLE email_change_tokens (token_hash TEXT, user_id UUID REFERENCES users(id));
    CREATE TABLE oauth_accounts (provider TEXT, user_id UUID REFERENCES users(id));
    CREATE TABLE paystack_references (reference TEXT, user_id UUID);
  `);
  if (withLegacy) {
    await db.exec(`
      CREATE TABLE user_tool_usage (user_id UUID NOT NULL REFERENCES users(id), tool TEXT);
      CREATE TABLE beta_reviews (user_id UUID PRIMARY KEY REFERENCES users(id), body TEXT);
    `);
  }
  await db.query("INSERT INTO users (id) VALUES ($1), ($2)", [USER, OTHER]);
}

describe("deleting an account", () => {
  beforeEach(() => schema(true));

  it("removes rows left in the old tables that would otherwise block the delete", async () => {
    await db.query("INSERT INTO user_tool_usage (user_id, tool) VALUES ($1, 'x'), ($2, 'x')", [USER, OTHER]);
    await db.query("INSERT INTO beta_reviews (user_id, body) VALUES ($1, 'hi')", [USER]);
    await db.query("INSERT INTO sessions (id, user_id) VALUES ('s', $1)", [USER]);

    await deleteUserData(run, USER);

    expect((await db.query("SELECT 1 FROM users WHERE id = $1", [USER])).rows).toHaveLength(0);
    expect(await count("user_tool_usage", USER)).toBe(0);
    expect(await count("beta_reviews", USER)).toBe(0);
    expect(await count("sessions", USER)).toBe(0);
  });

  it("leaves other people's data alone", async () => {
    await db.query("INSERT INTO user_tool_usage (user_id, tool) VALUES ($1, 'x')", [OTHER]);
    await deleteUserData(run, USER);
    expect((await db.query("SELECT 1 FROM users WHERE id = $1", [OTHER])).rows).toHaveLength(1);
    expect(await count("user_tool_usage", OTHER)).toBe(1);
  });
});

describe("deleting an account on a database that never had the old tables", () => {
  beforeEach(() => schema(false));

  it("still works", async () => {
    await deleteUserData(run, USER);
    expect((await db.query("SELECT 1 FROM users WHERE id = $1", [USER])).rows).toHaveLength(0);
  });
});
