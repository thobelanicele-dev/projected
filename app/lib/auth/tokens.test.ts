import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("generateToken", () => {
  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });

  it("generates a 64-character hex string (32 random bytes)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });

  it("does not return the raw token", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toBe(token);
  });
});
