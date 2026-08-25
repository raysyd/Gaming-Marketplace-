import { describe, it, expect } from "vitest";
import { estimateShippingCents, estimatedWeightGrams, estimateShippingCentsForListing } from "@/lib/shipping/estimate";

describe("estimateShippingCents", () => {
  it("matches AusPost's published tiers exactly at their boundaries", () => {
    expect(estimateShippingCents(250)).toBe(1020);
    expect(estimateShippingCents(500)).toBe(1170);
    expect(estimateShippingCents(1000)).toBe(1600);
    expect(estimateShippingCents(3000)).toBe(2025);
    expect(estimateShippingCents(5000)).toBe(2445);
  });

  it("picks the next tier up for a weight between boundaries", () => {
    expect(estimateShippingCents(1)).toBe(1020);
    expect(estimateShippingCents(2999)).toBe(2025);
  });

  it("falls back to a single rougher estimate above 5kg", () => {
    expect(estimateShippingCents(5001)).toBe(3500);
    expect(estimateShippingCents(20000)).toBe(3500);
  });
});

describe("estimatedWeightGrams", () => {
  it("uses the seller's own weight when given", () => {
    expect(estimatedWeightGrams("graphics-cards", 2500)).toBe(2500);
  });

  it("falls back to the subcategory default when the seller didn't specify one", () => {
    expect(estimatedWeightGrams("graphics-cards", null)).toBe(1500);
    expect(estimatedWeightGrams("graphics-cards", undefined)).toBe(1500);
    expect(estimatedWeightGrams("graphics-cards", 0)).toBe(1500);
  });

  it("falls back to a generic default for a subcategory with no entry", () => {
    expect(estimatedWeightGrams("not-a-real-subcategory")).toBe(1000);
  });
});

describe("estimateShippingCentsForListing", () => {
  it("combines weight resolution and the rate table", () => {
    expect(estimateShippingCentsForListing("processors")).toBe(1020); // 200g default -> <=250g tier
    expect(estimateShippingCentsForListing("cases")).toBe(3500); // 7000g default -> over 5kg
  });
});
