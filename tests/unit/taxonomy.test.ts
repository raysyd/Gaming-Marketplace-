import { describe, expect, it } from "vitest";
import { categoryOrFilter, resolveCategory } from "@/lib/taxonomy";

describe("resolveCategory", () => {
  it("derives the top category from the subcategory, ignoring a mismatched one", () => {
    expect(resolveCategory("monitors", "pc-parts-and-components")).toEqual({
      subcategorySlug: "monitors",
      categorySlug: "peripherals",
    });
  });

  it("falls back to a valid submitted category when the subcategory is unknown", () => {
    expect(resolveCategory("nope", "consoles")).toEqual({
      subcategorySlug: "graphics-cards",
      categorySlug: "consoles",
    });
  });

  it("falls back to defaults when neither is valid", () => {
    expect(resolveCategory(undefined, undefined)).toEqual({
      subcategorySlug: "graphics-cards",
      categorySlug: "pc-parts-and-components",
    });
  });
});

describe("categoryOrFilter", () => {
  it("matches the category slug or any of its subcategories", () => {
    expect(categoryOrFilter("consoles")).toBe(
      "category_slug.eq.consoles,subcategory_slug.in.(playstation,xbox,nintendo,handhelds)"
    );
  });

  it("returns null for an unknown category", () => {
    expect(categoryOrFilter("not-a-category")).toBeNull();
  });
});
