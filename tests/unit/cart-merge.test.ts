import { describe, it, expect } from "vitest";
import { mergeCarts, type CartItem } from "@/components/CartProvider";

const item = (over: Partial<CartItem>): CartItem => ({
  id: over.id ?? "id",
  slug: "slug",
  title: "title",
  price: 100,
  qty: 1,
  stock: 1,
  sellerId: "seller",
  shipsFree: true,
  ...over,
});

describe("mergeCarts (guest cart → account cart on sign-in)", () => {
  it("adds guest items the account cart doesn't have", () => {
    const merged = mergeCarts([item({ id: "a" })], [item({ id: "b" })]);
    expect(merged.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("keeps the larger quantity for the same listing instead of summing", () => {
    const merged = mergeCarts([item({ id: "a", qty: 2, stock: 5 })], [item({ id: "a", qty: 3, stock: 5 })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(3);
  });

  it("never goes over stock", () => {
    const merged = mergeCarts([item({ id: "a", qty: 1, stock: 2 })], [item({ id: "a", qty: 9, stock: 2 })]);
    expect(merged[0].qty).toBe(2);
  });

  it("leaves the account cart alone when the guest cart is empty", () => {
    const base = [item({ id: "a" })];
    expect(mergeCarts(base, [])).toEqual(base);
  });
});
