import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";

const ME = "00000000-0000-0000-0000-0000000000e1";
const OTHER = "00000000-0000-0000-0000-0000000000e2";

const state = vi.hoisted(() => ({
  db: null as import("@electric-sql/pglite").PGlite | null,
  session: null as null | Record<string, unknown>,
}));

vi.mock("@/app/lib/db", () => ({
  query: async (text: string, params: unknown[] = []) => (await state.db!.query(text, params)).rows,
}));
vi.mock("@/app/lib/auth/session", () => ({ getSession: async () => state.session }));
// The real limiter would block this file after five calls on one account; it has its own tests.
vi.mock("@/app/lib/rateLimit", () => ({ checkRateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }) }));

import { POST } from "@/app/api/auth/change-username/route";

function as(id: string, username: string) {
  state.session = { id, username, email: "x@example.com" };
}

function change(username: unknown) {
  return POST(
    new NextRequest("http://localhost/api/auth/change-username", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username }),
    })
  );
}

const nameOf = async (id: string) =>
  (await state.db!.query<{ username: string }>("SELECT username FROM users WHERE id = $1", [id])).rows[0].username;

beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec(`CREATE TABLE users (id UUID PRIMARY KEY, username TEXT UNIQUE NOT NULL);`);
});

beforeEach(async () => {
  await state.db!.exec("DELETE FROM users");
  await state.db!.query("INSERT INTO users (id, username) VALUES ($1, 'alex_fx'), ($2, 'Taken_Name')", [ME, OTHER]);
  as(ME, "alex_fx");
});

describe("POST /api/auth/change-username", () => {
  it("renames the account", async () => {
    const res = await change("new_name1");
    expect(res.status).toBe(200);
    expect((await res.json()).username).toBe("new_name1");
    expect(await nameOf(ME)).toBe("new_name1");
  });

  it("refuses a name someone else has, ignoring capitals", async () => {
    const res = await change("taken_name");
    expect(res.status).toBe(409);
    expect(await nameOf(ME)).toBe("alex_fx");
  });

  it("lets you change only the capitals of your own name", async () => {
    expect((await change("Alex_FX")).status).toBe(200);
    expect(await nameOf(ME)).toBe("Alex_FX");
  });

  it("rejects names that break the rules, and an unchanged name", async () => {
    expect((await change("ab")).status).toBe(400);
    expect((await change("1starts_with_number")).status).toBe(400);
    expect((await change("has space")).status).toBe(400);
    expect((await change(42)).status).toBe(400);
    expect((await change("alex_fx")).status).toBe(400);
    expect(await nameOf(ME)).toBe("alex_fx");
  });

  it("requires login", async () => {
    state.session = null;
    expect((await change("new_name1")).status).toBe(401);
  });
});
