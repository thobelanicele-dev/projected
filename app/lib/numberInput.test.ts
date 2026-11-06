import { describe, expect, it } from "vitest";
import { parseDecimal, parseMoney } from "./numberInput";

describe("parseDecimal", () => {
  it("reads plain numbers", () => {
    expect(parseDecimal("50")).toBe(50);
    expect(parseDecimal("1.0850")).toBe(1.085);
    expect(parseDecimal("-20")).toBe(-20);
    expect(parseDecimal(" 7 ")).toBe(7);
    expect(parseDecimal(".5")).toBe(0.5);
  });

  it("reads a decimal comma", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("1,0850")).toBe(1.085);
    expect(parseDecimal("1,085")).toBe(1.085); // a rate, so a comma is always a decimal point
  });

  it("works out which separator is the decimal point when both appear", () => {
    expect(parseDecimal("1,234.56")).toBe(1234.56);
    expect(parseDecimal("1.234,56")).toBe(1234.56);
  });

  it("ignores spaces used to group digits", () => {
    expect(parseDecimal("10 000")).toBe(10000);
    expect(parseDecimal("10 000,5")).toBe(10000.5);
  });

  it("treats repeated separators as thousands", () => {
    expect(parseDecimal("1,234,567")).toBe(1234567);
    expect(parseDecimal("1.234.567")).toBe(1234567);
  });

  it("rejects what isn't a number, instead of using the digits at the front", () => {
    for (const bad of ["", "   ", "abc", "12abc", "1e5", "--5", "1..2", "5,5,5x", "1 2 x"]) {
      expect(parseDecimal(bad)).toBeNaN();
    }
  });
});

describe("parseMoney", () => {
  it("reads a comma followed by three digits as thousands", () => {
    expect(parseMoney("10,000")).toBe(10000);
    expect(parseMoney("1,500")).toBe(1500);
    expect(parseMoney("-2,500")).toBe(-2500);
  });

  it("still reads other commas as decimals", () => {
    expect(parseMoney("12,5")).toBe(12.5);
    expect(parseMoney("1 000,50")).toBe(1000.5);
    expect(parseMoney("1,000.50")).toBe(1000.5);
  });

  it("reads plain amounts", () => {
    expect(parseMoney("10000")).toBe(10000);
    expect(parseMoney("250.75")).toBe(250.75);
    expect(parseMoney("abc")).toBeNaN();
  });
});
