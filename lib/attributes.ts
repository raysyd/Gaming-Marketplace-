/**
 * Per-subcategory required attributes — a generic alternative to hardcoding
 * "if subcategory === 'storage'" branches in the sell form or filter rail.
 * Add a subcategory here and both surfaces pick it up automatically.
 *
 * Values are stored in the listing's existing `specs` JSON as
 * `{ label, value }` — no schema change — using `label` exactly as written
 * below, so the filter rail's JSONB containment query
 * (`specs @> [{label, value}]`) matches what the sell form wrote.
 */
export type AttributeDef = {
  /** Stable key for form state and the `attr_<key>` URL param. */
  key: string;
  /** Spec label this attribute is stored/matched under. */
  label: string;
  kind: "select" | "text";
  options?: string[];
  required?: boolean;
  /** Show as a filter in the shop's filter rail when this subcategory is selected. */
  filterable?: boolean;
  placeholder?: string;
};

export const SUBCATEGORY_ATTRIBUTES: Record<string, AttributeDef[]> = {
  processors: [
    {
      key: "socket",
      label: "Socket",
      kind: "select",
      options: ["AM5", "AM4", "LGA1700", "LGA1200", "LGA1851", "Other"],
      required: true,
      filterable: true,
    },
  ],
  motherboards: [
    {
      key: "socket",
      label: "Socket",
      kind: "select",
      options: ["AM5", "AM4", "LGA1700", "LGA1200", "LGA1851", "Other"],
      required: true,
      filterable: true,
    },
    {
      key: "ramType",
      label: "RAM type",
      kind: "select",
      options: ["DDR5", "DDR4", "DDR3"],
      required: true,
      filterable: true,
    },
  ],
  memory: [
    {
      key: "ramType",
      label: "RAM type",
      kind: "select",
      options: ["DDR5", "DDR4", "DDR3"],
      required: true,
      filterable: true,
    },
  ],
  storage: [
    {
      key: "type",
      label: "Type",
      kind: "select",
      options: ["HDD", "SATA SSD", "NVMe SSD"],
      required: true,
      filterable: true,
    },
    {
      key: "capacity",
      label: "Capacity",
      kind: "text",
      required: true,
      placeholder: "1TB",
    },
  ],
  cooling: [
    {
      key: "type",
      label: "Type",
      kind: "select",
      options: ["AIO / liquid", "Air cooler", "Case fans"],
      required: true,
      filterable: true,
    },
  ],
};

export const attributesFor = (sub: string): AttributeDef[] =>
  SUBCATEGORY_ATTRIBUTES[sub] ?? [];

/** URL search-param name for a given attribute — `attr_type`, `attr_capacity`, etc. */
export const attrParam = (key: string) => `attr_${key}`;

/**
 * Reads the filterable attribute selections for a subcategory out of a
 * searchParams-shaped object and returns them as `{ label: value }` pairs,
 * ready to pass straight to a JSONB containment filter.
 */
export function attrsFromSearchParams(
  sub: string | undefined,
  sp: Record<string, string | undefined>
): Record<string, string> {
  if (!sub) return {};
  const out: Record<string, string> = {};
  for (const def of attributesFor(sub)) {
    if (!def.filterable) continue;
    const v = sp[attrParam(def.key)];
    if (v) out[def.label] = v;
  }
  return out;
}

/**
 * The inverse of how SellForm saves attributes: they're stored as ordinary
 * {label, value} specs, so a draft being resumed (or a live listing being
 * edited) has to pull them back out into their own fields — otherwise the
 * required ones read as missing and re-saving would duplicate them.
 */
export function splitAttrSpecs(
  sub: string,
  specs: { label: string; value: string }[]
): { attrs: Record<string, string>; rest: { label: string; value: string }[] } {
  const defs = attributesFor(sub);
  const attrs: Record<string, string> = {};
  const rest = specs.filter((s) => {
    const def = defs.find((d) => d.label === s.label && !(d.key in attrs));
    if (!def) return true;
    attrs[def.key] = s.value;
    return false;
  });
  return { attrs, rest };
}
