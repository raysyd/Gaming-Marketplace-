import { describe, it, expect } from "vitest";
import { checkCompatibility } from "@/lib/compatibility";
import type { CartItem } from "@/components/CartProvider";

const item = (over: Partial<CartItem>): CartItem => ({
  id: over.id ?? "id",
  slug: "slug",
  title: over.title ?? "title",
  price: 100,
  qty: 1,
  stock: 1,
  sellerId: "seller",
  shipsFree: true,
  ...over,
});

describe("checkCompatibility", () => {
  it("reports 'unknown' when there's nothing to check (no CPU+board or board+RAM pair)", () => {
    const items = [item({ subcategorySlug: "graphics-cards" })];
    expect(checkCompatibility(items)).toEqual({ status: "unknown" });
  });

  it("reports 'unknown' rather than a false positive when an attribute is missing", () => {
    const items = [
      item({ id: "cpu", subcategorySlug: "processors", specs: [] }),
      item({ id: "board", subcategorySlug: "motherboards", specs: [{ label: "Socket", value: "AM5" }] }),
    ];
    expect(checkCompatibility(items)).toEqual({ status: "unknown" });
  });

  it("reports 'ok' for a matching CPU socket and RAM type", () => {
    const items = [
      item({ id: "cpu", title: "Ryzen 7 7800X3D", subcategorySlug: "processors", specs: [{ label: "Socket", value: "AM5" }] }),
      item({
        id: "board",
        title: "MSI B650",
        subcategorySlug: "motherboards",
        specs: [
          { label: "Socket", value: "AM5" },
          { label: "RAM type", value: "DDR5" },
        ],
      }),
      item({ id: "ram", title: "32GB DDR5 kit", subcategorySlug: "memory", specs: [{ label: "RAM type", value: "DDR5" }] }),
    ];
    expect(checkCompatibility(items)).toEqual({ status: "ok" });
  });

  it("flags a socket mismatch and a RAM type mismatch, both, with real listing titles in the message", () => {
    const items = [
      item({ id: "cpu", title: "Ryzen 7 7800X3D", subcategorySlug: "processors", specs: [{ label: "Socket", value: "AM5" }] }),
      item({
        id: "board",
        title: "ASUS B450",
        subcategorySlug: "motherboards",
        specs: [
          { label: "Socket", value: "AM4" },
          { label: "RAM type", value: "DDR4" },
        ],
      }),
      item({ id: "ram", title: "32GB DDR5 kit", subcategorySlug: "memory", specs: [{ label: "RAM type", value: "DDR5" }] }),
    ];
    const result = checkCompatibility(items);
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") {
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain("Ryzen 7 7800X3D");
      expect(result.warnings[1]).toContain("32GB DDR5 kit");
    }
  });
});
