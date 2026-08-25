import type { CartItem } from "@/components/CartProvider";

export type CompatibilityResult =
  | { status: "unknown" }
  | { status: "ok" }
  | { status: "conflict"; warnings: string[] };

/**
 * Cross-checks CPU/motherboard sockets and motherboard/RAM types across
 * the items actually in the cart — real seller-provided data (see
 * lib/attributes.ts's `processors`/`motherboards`/`memory` attributes),
 * never a guess. Silently skips a pair when either side is missing the
 * relevant attribute (an older listing from before this shipped) rather
 * than risk a false positive or false "compatible" on incomplete data —
 * "unknown" (nothing worth checking was in the cart) is a distinct,
 * honest result from "ok" (checked, and it's fine).
 */
export function checkCompatibility(items: CartItem[]): CompatibilityResult {
  const specValue = (item: CartItem, label: string) =>
    item.specs?.find((s) => s.label === label)?.value;

  const cpus = items.filter((i) => i.subcategorySlug === "processors");
  const boards = items.filter((i) => i.subcategorySlug === "motherboards");
  const ram = items.filter((i) => i.subcategorySlug === "memory");

  const warnings: string[] = [];
  let checkedAnything = false;

  for (const cpu of cpus) {
    const cpuSocket = specValue(cpu, "Socket");
    if (!cpuSocket) continue;
    for (const board of boards) {
      const boardSocket = specValue(board, "Socket");
      if (!boardSocket) continue;
      checkedAnything = true;
      if (cpuSocket !== boardSocket)
        warnings.push(`${cpu.title} (${cpuSocket}) doesn't fit ${board.title} (${boardSocket} socket).`);
    }
  }

  for (const board of boards) {
    const boardRam = specValue(board, "RAM type");
    if (!boardRam) continue;
    for (const stick of ram) {
      const ramType = specValue(stick, "RAM type");
      if (!ramType) continue;
      checkedAnything = true;
      if (boardRam !== ramType)
        warnings.push(`${stick.title} (${ramType}) isn't supported by ${board.title} (${boardRam} only).`);
    }
  }

  if (!checkedAnything) return { status: "unknown" };
  if (warnings.length) return { status: "conflict", warnings };
  return { status: "ok" };
}
