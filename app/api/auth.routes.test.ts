import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";

const GOOGLE_ONLY = "00000000-0000-0000-0000-0000000000a1";
const WITH_PASSWORD = "00000000-0000-0000-0000-0000000000a2";
const UNVERIFIED = "00000000-0000-0000-0000-0000000000a3";
const VERIFIED = "00000000-0000-0000-0000-0000000000a4";

const state = vi.hoisted(() => ({
  db: null as import("@electric-sql/pglite").PGlite | null,
  session: null as null | Record<string, unknown>,
  confirmTokens: [] as string[],
  approvalTokens: [] as string[],
  notices: 0,
}));

vi.mock("@/app/lib/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await state.db!.query(text, params)).rows,
}));
vi.mock("@/app/lib/auth/session", () => ({ getSession: async () => state.session }));
vi.mock("@/app/lib/email", () => ({
  sendEmailChangeConfirmation: async (_to: string, token: string) => void state.confirmTokens.push(token),
  sendEmailChangeApproval: async (_to: string, _n: string, token: string) => void state.approvalTokens.push(token),
  sendEmailChangeNotice: async () => void (state.notices += 1),
}));

import { POST as requestPost } from "@/app/api/auth/change-email/request/route";
import { GET as confirmGet } from "@/app/api/auth/change-email/confirm/route";
import { GET as approveGet } from "@/app/api/auth/change-email/approve/route";
import { claimUnverifiedAccountForGoogle } from "@/app/lib/auth/accountLink";
import { hashPassword } from "@/app/lib/auth/password";

const PASSWORD = "correct horse battery staple 42";

function login(id: string, email: string) {
  state.session = { id, email };
}

function change(newEmail: string, currentPassword = "") {
  return requestPost(
    new NextRequest("http://localhost/api/auth/change-email/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword }),
    })
  );
}

const link = (path: string, token: string) =>
  new NextRequest(`http://localhost/api/auth/change-email/${path}?token=${token}`);

async function emailOf(id: string) {
  return (await state.db!.query<{ email: string }>("SELECT email FROM users WHERE id = $1", [id])).rows[0].email;
}

beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec(`
    CREATE TABLE users (
      id UUID PRIMARY KEY, email TEXT UNIQUE NOT NULL, username TEXT, password_hash TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE TABLE sessions (id TEXT, user_id UUID);
    CREATE TABLE email_verification_tokens (token_hash TEXT, user_id UUID);
    CREATE TABLE password_reset_tokens (token_hash TEXT, user_id UUID);
    CREATE TABLE email_change_tokens (
      token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL, new_email TEXT NOT NULL,
      expires_at BIGINT NOT NULL, approval_token_hash TEXT
    );
  `);
  const hash = hashPassword(PASSWORD);
  await state.db.query(
    `INSERT INTO users (id, email, username, password_hash, email_verified) VALUES
     ($1, 'google@example.com', 'g', NULL, TRUE),
     ($2, 'pw@example.com', 'p', $5, TRUE),
     ($3, 'victim@example.com', 'u', $5, FALSE),
     ($4, 'owner@example.com', 'o', $5, TRUE)`,
    [GOOGLE_ONLY, WITH_PASSWORD, UNVERIFIED, VERIFIED, hash]
  );
});

beforeEach(() => {
  state.confirmTokens = [];
  state.approvalTokens = [];
  state.notices = 0;
});

describe("changing the email on an account with no password", () => {
  it("does not move the email on the new address's link alone", async () => {
    login(GOOGLE_ONLY, "google@example.com");
    const res = await change("thief@example.com");
    expect(res.status).toBe(200);
    expect((await res.json()).needsApproval).toBe(true);
    expect(state.approvalTokens).toHaveLength(1);

    const confirm = await confirmGet(link("confirm", state.confirmTokens[0]));
    expect(confirm.headers.get("location")).toContain("error=needs-approval");
    expect(await emailOf(GOOGLE_ONLY)).toBe("google@example.com");
  });

  it("moves the email once the current address has approved and the new one has confirmed", async () => {
    login(GOOGLE_ONLY, "google@example.com");
    await change("new@example.com");

    const approved = await approveGet(link("approve", state.approvalTokens[0]));
    expect(approved.headers.get("location")).toContain("approved=true");

    const confirm = await confirmGet(link("confirm", state.confirmTokens[0]));
    expect(confirm.headers.get("location")).toContain("success=true");
    expect(await emailOf(GOOGLE_ONLY)).toBe("new@example.com");
  });

  it("rejects an unknown approval link", async () => {
    const res = await approveGet(link("approve", "not-a-real-token"));
    expect(res.headers.get("location")).toContain("error=invalid-or-expired");
  });
});

describe("changing the email on an account with a password", () => {
  it("still needs the password, and then needs no extra approval", async () => {
    login(WITH_PASSWORD, "pw@example.com");
    expect((await change("x@example.com", "wrong")).status).toBe(400);

    const res = await change("pw2@example.com", PASSWORD);
    expect((await res.json()).needsApproval).toBe(false);
    expect(state.approvalTokens).toHaveLength(0);
    expect(state.notices).toBe(1);

    const confirm = await confirmGet(link("confirm", state.confirmTokens[0]));
    expect(confirm.headers.get("location")).toContain("success=true");
    expect(await emailOf(WITH_PASSWORD)).toBe("pw2@example.com");
  });
});

describe("Google proving ownership of an existing email", () => {
  it("throws away the password someone else set on a never-verified account", async () => {
    await state.db!.query("INSERT INTO sessions (id, user_id) VALUES ('s1', $1)", [UNVERIFIED]);
    await state.db!.query("INSERT INTO email_verification_tokens (token_hash, user_id) VALUES ('t1', $1)", [UNVERIFIED]);

    await claimUnverifiedAccountForGoogle(UNVERIFIED);

    const u = (await state.db!.query<{ password_hash: string | null; email_verified: boolean }>(
      "SELECT password_hash, email_verified FROM users WHERE id = $1", [UNVERIFIED])).rows[0];
    expect(u).toEqual({ password_hash: null, email_verified: true });
    expect((await state.db!.query("SELECT 1 FROM sessions WHERE user_id = $1", [UNVERIFIED])).rows).toHaveLength(0);
    expect((await state.db!.query("SELECT 1 FROM email_verification_tokens WHERE user_id = $1", [UNVERIFIED])).rows).toHaveLength(0);
  });

  it("leaves an already verified account's password alone", async () => {
    await claimUnverifiedAccountForGoogle(VERIFIED);
    const u = (await state.db!.query<{ password_hash: string | null }>(
      "SELECT password_hash FROM users WHERE id = $1", [VERIFIED])).rows[0];
    expect(u.password_hash).not.toBeNull();
  });
});
