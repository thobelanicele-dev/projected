import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";

const USER = "00000000-0000-0000-0000-0000000000d1";

const state = vi.hoisted(() => ({
  db: null as import("@electric-sql/pglite").PGlite | null,
  sessionsCreated: 0,
}));

vi.mock("@/app/lib/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await state.db!.query(text, params)).rows,
}));
vi.mock("@/app/lib/auth/session", () => ({
  createSession: async () => void (state.sessionsCreated += 1),
}));

import { GET } from "@/app/api/auth/verify-email/route";
import { hashToken } from "@/app/lib/auth/tokens";

beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec(`
    CREATE TABLE users (id UUID PRIMARY KEY, email_verified BOOLEAN NOT NULL DEFAULT FALSE);
    CREATE TABLE email_verification_tokens (token_hash TEXT PRIMARY KEY, user_id UUID, expires_at BIGINT);
  `);
  await state.db.query("INSERT INTO users (id) VALUES ($1)", [USER]);
  await state.db.query("INSERT INTO email_verification_tokens VALUES ($1, $2, $3)", [
    hashToken("good-token"),
    USER,
    Date.now() + 60_000,
  ]);
});

describe("GET /api/auth/verify-email", () => {
  it("verifies the email but never signs the browser in", async () => {
    const res = await GET(new NextRequest("http://localhost/api/auth/verify-email?token=good-token"));
    expect(res.headers.get("location")).toContain("success=true");
    expect(state.sessionsCreated).toBe(0);
    expect(res.headers.get("set-cookie")).toBeNull();
    const row = (await state.db!.query<{ email_verified: boolean }>("SELECT email_verified FROM users WHERE id = $1", [USER])).rows[0];
    expect(row.email_verified).toBe(true);
  });
});
