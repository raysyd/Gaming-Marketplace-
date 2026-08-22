import { describe, it, expect } from "vitest";
import { isPremiumActive } from "@/lib/premium";

describe("isPremiumActive", () => {
  it("is true only for 'active'", () => {
    expect(isPremiumActive("active")).toBe(true);
  });

  it("is false for every other Stripe subscription status, and for null/undefined", () => {
    for (const status of ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "trialing"]) {
      expect(isPremiumActive(status)).toBe(false);
    }
    expect(isPremiumActive(null)).toBe(false);
    expect(isPremiumActive(undefined)).toBe(false);
    expect(isPremiumActive("")).toBe(false);
  });
});
