import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test-${Math.random()}`;
    const limit = 3;
    const windowMs = 60_000;

    for (let i = 0; i < limit; i++) {
      const result = checkRateLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
    }

    const blocked = checkRateLimit(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets once the window elapses", async () => {
    const key = `test-${Math.random()}`;
    const limit = 1;
    const windowMs = 50;

    expect(checkRateLimit(key, limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit(key, limit, windowMs).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));

    expect(checkRateLimit(key, limit, windowMs).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const limit = 1;
    const windowMs = 60_000;
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;

    expect(checkRateLimit(keyA, limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit(keyA, limit, windowMs).allowed).toBe(false);
    expect(checkRateLimit(keyB, limit, windowMs).allowed).toBe(true);
  });
});
