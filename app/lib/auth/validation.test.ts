import { describe, expect, it } from "vitest";
import { isValidEmail, isValidPassword, isValidUsername } from "./validation";

describe("isValidEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(isValidEmail("thobelani.cele@icloud.com")).toBeNull();
    expect(isValidEmail("a@b.co")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(isValidEmail("")).not.toBeNull();
    expect(isValidEmail("   ")).not.toBeNull();
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("not-an-email")).not.toBeNull();
    expect(isValidEmail("missing@domain")).not.toBeNull();
    expect(isValidEmail("@no-local-part.com")).not.toBeNull();
    expect(isValidEmail("spaces in@email.com")).not.toBeNull();
  });
});

describe("isValidPassword", () => {
  it("accepts passwords within 8-72 characters", () => {
    expect(isValidPassword("a".repeat(8))).toBeNull();
    expect(isValidPassword("a".repeat(72))).toBeNull();
    expect(isValidPassword("a".repeat(40))).toBeNull();
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(isValidPassword("a".repeat(7))).not.toBeNull();
  });

  it("rejects passwords longer than 72 characters", () => {
    expect(isValidPassword("a".repeat(73))).not.toBeNull();
  });
});

describe("isValidUsername", () => {
  it("accepts valid usernames", () => {
    expect(isValidUsername("abc")).toBeNull();
    expect(isValidUsername("Trader_123")).toBeNull();
    expect(isValidUsername("a".repeat(20))).toBeNull();
  });

  it("rejects usernames shorter than 3 or longer than 20 characters", () => {
    expect(isValidUsername("ab")).not.toBeNull();
    expect(isValidUsername("a".repeat(21))).not.toBeNull();
  });

  it("rejects usernames that don't start with a letter", () => {
    expect(isValidUsername("1abc")).not.toBeNull();
    expect(isValidUsername("_abc")).not.toBeNull();
  });

  it("rejects usernames with invalid characters", () => {
    expect(isValidUsername("abc def")).not.toBeNull();
    expect(isValidUsername("abc-def")).not.toBeNull();
    expect(isValidUsername("abc@def")).not.toBeNull();
  });
});
