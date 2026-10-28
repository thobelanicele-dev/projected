import { describe, expect, it } from "vitest";
import { effectiveTier } from "./planLimits";
import { compedEmails, isComped, withCompedAccess } from "./compedAccess";

const free = { email: "owner@example.com", emailVerified: true, plan: null, subscriptionStatus: null, planEndsAt: null };

describe("complimentary Premium", () => {
  it("reads a comma-separated list, ignoring case, spaces and blanks", () => {
    expect([...compedEmails(" Owner@Example.com , ,friend@example.com ")]).toEqual(["owner@example.com", "friend@example.com"]);
    expect(compedEmails(undefined).size).toBe(0);
    expect(compedEmails("").size).toBe(0);
  });

  it("makes a listed, verified account Premium everywhere", () => {
    const user = withCompedAccess(free, "owner@example.com");
    expect(user.complimentary).toBe(true);
    expect(effectiveTier(user)).toBe("premium");
  });

  it("matches the address whatever its capitals", () => {
    expect(isComped({ ...free, email: "OWNER@Example.COM" }, "owner@example.com")).toBe(true);
  });

  it("does nothing for anyone who isn't listed", () => {
    const user = withCompedAccess({ ...free, email: "someone@example.com" }, "owner@example.com");
    expect(user.complimentary).toBe(false);
    expect(effectiveTier(user)).toBe("free");
  });

  it("does nothing when the list is empty", () => {
    expect(withCompedAccess(free, "").complimentary).toBe(false);
  });

  it("refuses an unverified email, so nobody can claim an address by signing up with it", () => {
    const user = withCompedAccess({ ...free, emailVerified: false }, "owner@example.com");
    expect(user.complimentary).toBe(false);
    expect(effectiveTier(user)).toBe("free");
  });

  it("keeps a real paid plan untouched for people who aren't listed", () => {
    const paid = { ...free, email: "payer@example.com", plan: "basic", subscriptionStatus: "active" };
    expect(effectiveTier(withCompedAccess(paid, "owner@example.com"))).toBe("basic");
  });
});
