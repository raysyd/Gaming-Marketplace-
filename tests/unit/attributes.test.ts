import { describe, expect, it } from "vitest";
import { splitAttrSpecs } from "@/lib/attributes";

describe("splitAttrSpecs", () => {
  it("pulls saved attribute specs back into their own fields", () => {
    const { attrs, rest } = splitAttrSpecs("processors", [
      { label: "Socket", value: "AM5" },
      { label: "Cores", value: "8" },
    ]);
    expect(attrs).toEqual({ socket: "AM5" });
    expect(rest).toEqual([{ label: "Cores", value: "8" }]);
  });

  it("leaves everything as free-form specs for a subcategory without attributes", () => {
    const specs = [{ label: "Socket", value: "AM5" }];
    expect(splitAttrSpecs("collectibles", specs)).toEqual({ attrs: {}, rest: specs });
  });

  it("only claims the first spec per attribute, keeping duplicates visible", () => {
    const { attrs, rest } = splitAttrSpecs("processors", [
      { label: "Socket", value: "AM5" },
      { label: "Socket", value: "AM4" },
    ]);
    expect(attrs).toEqual({ socket: "AM5" });
    expect(rest).toEqual([{ label: "Socket", value: "AM4" }]);
  });
});
