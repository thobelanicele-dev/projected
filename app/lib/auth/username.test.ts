import { describe, expect, it } from "vitest";
import { generateUsernameFromEmail } from "./username";

const neverTaken = async () => false;

describe("generateUsernameFromEmail", () => {
  it("uses the sanitized local-part when it's free", async () => {
    const username = await generateUsernameFromEmail("trader@example.com", neverTaken);
    expect(username).toBe("trader");
  });

  it("strips dots and plus-tags", async () => {
    const username = await generateUsernameFromEmail("j.doe+trading@gmail.com", neverTaken);
    expect(username).toBe("jdoetrading");
  });

  it("strips a leading digit so the result still starts with a letter", async () => {
    const username = await generateUsernameFromEmail("123trader@gmail.com", neverTaken);
    expect(username).toBe("trader");
  });

  it("falls back to 'user' when nothing letter-like remains", async () => {
    const username = await generateUsernameFromEmail("123@example.com", neverTaken);
    expect(username.startsWith("user")).toBe(true);
  });

  it("retries with a numeric suffix on collision", async () => {
    let calls = 0;
    const isTaken = async (candidate: string) => {
      calls += 1;
      return candidate === "trader"; // only the bare base is taken
    };
    const username = await generateUsernameFromEmail("trader@example.com", isTaken);
    expect(username).toMatch(/^trader_\d{4}$/);
    expect(calls).toBeGreaterThan(1);
  });

  it("throws if it can't find a free username after repeated attempts", async () => {
    const alwaysTaken = async () => true;
    await expect(generateUsernameFromEmail("trader@example.com", alwaysTaken)).rejects.toThrow();
  });

  it("never returns a username that fails validation", async () => {
    const username = await generateUsernameFromEmail("a@b.com", neverTaken);
    expect(username).toMatch(/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/);
  });
});
