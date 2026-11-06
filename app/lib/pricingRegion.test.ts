import { describe, expect, it } from "vitest";
import { currencyForCountry } from "./pricingRegion";

describe("currencyForCountry", () => {
  it("shows Rand in South Africa", () => {
    expect(currencyForCountry("ZA")).toBe("ZAR");
  });

  it("shows Pounds in the UK", () => {
    expect(currencyForCountry("GB")).toBe("GBP");
  });

  it("shows Euro across Europe, inside and outside the eurozone", () => {
    for (const code of ["DE", "FR", "IE", "NL", "ES", "IT", "PL", "SE", "NO", "CH", "UA"]) {
      expect(currencyForCountry(code)).toBe("EUR");
    }
  });

  it("shows US Dollar in the Americas, Asia and the rest of Africa", () => {
    for (const code of ["US", "CA", "BR", "MX", "IN", "JP", "AE", "SG", "NG", "KE", "EG", "BW", "AU"]) {
      expect(currencyForCountry(code)).toBe("USD");
    }
  });

  it("falls back to US Dollar when the country is unknown", () => {
    expect(currencyForCountry(undefined)).toBe("USD");
    expect(currencyForCountry(null)).toBe("USD");
    expect(currencyForCountry("")).toBe("USD");
    expect(currencyForCountry("T1")).toBe("USD");
  });

  it("ignores letter case and stray spaces", () => {
    expect(currencyForCountry(" za ")).toBe("ZAR");
    expect(currencyForCountry("de")).toBe("EUR");
  });
});
