import { describe, it, expect } from "vitest";
import { modelOf } from "@/lib/models";
import { marketTagFor, type ModelStats } from "@/lib/market-index";

const gpu = (title: string) => ({ title, subcategorySlug: "graphics-cards" });

describe("modelOf", () => {
  it("prefers the most specific model name", () => {
    expect(modelOf(gpu("ASUS TUF RTX 4070 Ti Super 16GB"))?.name).toBe("RTX 4070 Ti Super");
    expect(modelOf(gpu("Gigabyte 4070 Ti OC"))?.name).toBe("RTX 4070 Ti");
    expect(modelOf(gpu("MSI RTX 4070 Ventus"))?.name).toBe("RTX 4070");
    expect(modelOf(gpu("Sapphire Pulse 7900 XTX"))?.name).toBe("RX 7900 XTX");
  });
  it("only matches part listings, not whole PCs", () => {
    expect(modelOf({ title: "RTX 4070 gaming PC", subcategorySlug: "gaming-pcs" })).toBeNull();
    expect(modelOf({ title: "Ryzen 7 7800X3D tray", subcategorySlug: "processors" })?.name).toBe("Ryzen 7 7800X3D");
  });
});

describe("marketTagFor", () => {
  const index: ModelStats[] = [
    { key: "rtx-3080", name: "RTX 3080", kind: "gpu", rate: 600, low: 500, high: 700, lowestAsk: 540, forSale: 4, sold: 2, comps: 6, change: null, spark: [], points: [] },
  ];
  it("expresses price against the going rate", () => {
    const tag = marketTagFor({ ...gpu("RTX 3080 FE"), price: 540 }, index);
    expect(tag?.rate).toBe(600);
    expect(tag?.delta).toBeCloseTo(-0.1);
  });
  it("has no tag for a model without a rate", () => {
    expect(marketTagFor({ ...gpu("RTX 4090"), price: 2500 }, index)).toBeUndefined();
  });
});
