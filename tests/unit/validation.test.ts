import { describe, it, expect } from "vitest";
import { isValidUsername, isValidQuantity, MAX_LISTING_QUANTITY } from "@/lib/validation";

describe("isValidUsername", () => {
  it("accepts lowercase letters, digits and underscores, 3-20 chars", () => {
    expect(isValidUsername("rtx_rayan")).toBe(true);
    expect(isValidUsername("abc")).toBe(true);
    expect(isValidUsername("a".repeat(20))).toBe(true);
  });

  it("rejects anything outside that alphabet or length", () => {
    expect(isValidUsername("ab")).toBe(false); // too short
    expect(isValidUsername("a".repeat(21))).toBe(false); // too long
    expect(isValidUsername("Rayan")).toBe(false); // uppercase
    expect(isValidUsername("ray an")).toBe(false); // space
    expect(isValidUsername("ray-an")).toBe(false); // hyphen
    expect(isValidUsername("ray'; drop table profiles;--")).toBe(false);
    expect(isValidUsername("")).toBe(false);
  });
});

describe("isValidQuantity", () => {
  it("accepts positive integers up to the cap", () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(500)).toBe(true);
    expect(isValidQuantity(MAX_LISTING_QUANTITY)).toBe(true);
  });

  it("rejects zero, negative, non-integer, over-cap and non-finite values", () => {
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(-1)).toBe(false);
    expect(isValidQuantity(1.5)).toBe(false);
    expect(isValidQuantity(501)).toBe(false);
    expect(isValidQuantity(NaN)).toBe(false);
    expect(isValidQuantity(Infinity)).toBe(false);
  });
});
