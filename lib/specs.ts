/**
 * Suggested spec labels per subcategory. Listings already store specs as
 * freeform {label, value} pairs (see lib/types.ts) — this doesn't add a new
 * schema, it just seeds the /sell form with the fields buyers actually
 * filter by mentally for that kind of part, so sellers don't have to guess
 * what's worth listing.
 */
export const SUGGESTED_SPECS: Record<string, string[]> = {
  "gaming-pcs": ["GPU", "CPU", "RAM", "Storage", "PSU"],
  "gaming-laptops": ["GPU", "CPU", "RAM", "Storage", "Screen size", "Refresh rate"],
  workstations: ["GPU", "CPU", "RAM", "Storage", "ECC support"],
  "graphics-cards": ["Model", "VRAM", "Length", "Power connector"],
  processors: ["Model", "Cores / Threads", "Socket", "Base clock"],
  memory: ["Capacity", "Speed", "Type", "Kit"],
  storage: ["Type", "Capacity", "Read speed"],
  motherboards: ["Socket", "Form factor", "Chipset"],
  "power-supplies": ["Wattage", "Efficiency rating", "Modular"],
  cases: ["Form factor", "Color", "Fans included", "Tempered glass", "Front I/O"],
  cooling: ["Type", "Radiator size", "Fan count", "RGB"],
  monitors: ["Size", "Resolution", "Refresh rate", "Panel type"],
  keyboards: ["Switch type", "Layout", "Wireless"],
  mice: ["DPI", "Wireless", "Weight"],
  headsets: ["Wireless", "Surround sound", "Mic"],
  playstation: ["Storage", "Included controllers", "Bundle"],
  xbox: ["Storage", "Included controllers", "Bundle"],
  nintendo: ["Storage", "Included controllers", "Bundle"],
  handhelds: ["Storage", "Battery life", "Included accessories"],
  "mini-pcs": ["GPU", "CPU", "RAM", "Storage", "Form factor"],
  "cables-extensions": ["Type", "Length", "Connector"],
  collectibles: ["Era", "Included items", "Condition notes"],
  "for-parts": ["Fault description", "What works", "What doesn't"],
  "retro-hardware": ["Era", "Tested", "Condition notes"],
};
