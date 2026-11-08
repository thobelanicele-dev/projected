import { describe, expect, it } from "vitest";
import { squareCrop } from "@/app/lib/avatar";

describe("squareCrop", () => {
  it("crops the sides of a wide photo, keeping the middle", () => {
    expect(squareCrop(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 });
  });

  it("crops the top and bottom of a tall photo, keeping the middle", () => {
    expect(squareCrop(200, 600)).toEqual({ sx: 0, sy: 200, side: 200 });
  });

  it("leaves a square photo alone", () => {
    expect(squareCrop(300, 300)).toEqual({ sx: 0, sy: 0, side: 300 });
  });
});
