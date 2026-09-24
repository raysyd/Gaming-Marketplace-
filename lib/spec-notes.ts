import { gpuRating, cpuRating } from "./performance";

/**
 * One-line, plain-English notes for the listing page's spec sheet, so a
 * buyer who doesn't know hardware can tell what each part means for them.
 * GPU/CPU notes use the same rough ratings as lib/performance.ts; the rest
 * are rules of thumb parsed from the value. Returns null when there's
 * nothing useful to say, and the row just shows the value.
 */

const gb = (v: string): number | null => {
  const tb = v.match(/(\d+(?:\.\d+)?)\s*tb/i);
  if (tb) return parseFloat(tb[1]) * 1000;
  const g = v.match(/(\d+(?:\.\d+)?)\s*gb/i);
  return g ? parseFloat(g[1]) : null;
};

function gpuNote(v: string): string | null {
  const r = gpuRating(v);
  if (r == null) return null;
  if (r >= 90) return "Flagship graphics. 4K at high settings and very high frame rates at 1440p.";
  if (r >= 65) return "High-end graphics. High-refresh 1440p and capable 4K.";
  if (r >= 45) return "Upper mid-range. A great fit for 1440p gaming.";
  if (r >= 30) return "Mid-range. Smooth 1080p, playable 1440p at medium settings.";
  if (r >= 18) return "Entry level. 1080p at medium to high settings.";
  return "Older card. Best for esports and lighter games at 1080p.";
}

function cpuNote(v: string): string | null {
  const r = cpuRating(v);
  if (r == null) return null;
  const x3d = /x3d/i.test(v) ? " 3D V-Cache chips are especially strong in games." : "";
  if (r >= 95) return `One of the fastest gaming CPUs. Won't hold back any graphics card.${x3d}`;
  if (r >= 80) return `Strong gaming CPU. Pairs well with high-end graphics.${x3d}`;
  if (r >= 65) return "Solid mid-range CPU. Handles modern games comfortably.";
  if (r >= 50) return "Capable, but may hold back top-end graphics cards.";
  return "Older CPU. May limit frame rates with newer graphics cards.";
}

function ramNote(v: string): string | null {
  const n = gb(v);
  if (n == null) return null;
  const gen = /ddr5/i.test(v) ? " DDR5 is the current, faster standard." : /ddr4/i.test(v) ? " DDR4 is the previous standard, still fine for gaming." : "";
  if (n >= 64) return `More than enough, even for video editing and heavy multitasking.${gen}`;
  if (n >= 32) return `Ideal for gaming with Discord, a browser and streaming open.${gen}`;
  if (n >= 16) return `Enough for most games today.${gen}`;
  return "On the low side for modern games. Easy to upgrade later.";
}

function storageNote(v: string): string | null {
  const n = gb(v);
  if (n == null) return null;
  const fast = /nvme/i.test(v) ? " NVMe means fast load times." : /hdd/i.test(v) ? " A hard drive is slower to load games." : "";
  // Big modern games are commonly 80–150 GB.
  if (n >= 4000) return `Space for a large game library.${fast}`;
  if (n >= 2000) return `Room for about 15 to 20 large games.${fast}`;
  if (n >= 1000) return `Room for about 8 to 10 large games.${fast}`;
  if (n >= 500) return `Room for about 4 or 5 large games.${fast}`;
  return `Tight for modern games. You may want to add a drive.${fast}`;
}

function psuNote(v: string): string | null {
  const w = v.match(/(\d{3,4})\s*w/i);
  if (!w) return null;
  const rating = v.match(/(bronze|silver|gold|platinum|titanium)/i)?.[1];
  const eff = rating ? ` 80+ ${rating[0].toUpperCase()}${rating.slice(1).toLowerCase()} is an efficiency rating: less wasted power and heat.` : "";
  return `${w[1]} W power supply.${eff}`;
}

function vramNote(v: string): string | null {
  const n = gb(v);
  if (n == null) return null;
  if (n >= 20) return "Plenty of video memory, even for 4K textures.";
  if (n >= 16) return "Comfortable for 1440p and 4K.";
  if (n >= 12) return "Good for 1440p.";
  if (n >= 8) return "Fine for 1080p. Can be tight at high settings in new games.";
  return "Limited video memory for modern games.";
}

function refreshNote(v: string): string | null {
  const hz = v.match(/(\d{2,3})\s*hz/i);
  if (!hz) return null;
  const n = +hz[1];
  if (n >= 240) return "Very smooth motion. Built for competitive shooters.";
  if (n >= 144) return "Smooth, high-refresh gaming.";
  return "Standard refresh rate. Fine for casual and single-player games.";
}

export function specNote(label: string, value: string): string | null {
  switch (label.toLowerCase()) {
    case "gpu": return gpuNote(value);
    case "cpu": return cpuNote(value);
    case "ram": case "memory": return ramNote(value);
    case "ssd": case "storage": return storageNote(value);
    case "psu": case "wattage": return psuNote(value);
    case "vram": return vramNote(value);
    case "refresh rate": return refreshNote(value);
    case "model": return gpuNote(value) ?? cpuNote(value);
    default: return null;
  }
}

/** Resolutions a system or graphics card is comfortable at, from its GPU rating. */
export function goodFor(gpuText: string): string[] {
  const r = gpuRating(gpuText);
  if (r == null) return [];
  const out: string[] = [];
  if (r >= 14) out.push("1080p");
  if (r >= 40) out.push("1440p");
  if (r >= 65) out.push("4K");
  return out;
}

/**
 * Flags a lopsided GPU/CPU pairing, the most common mistake in second-hand
 * builds (e.g. a flagship card with an entry CPU). Null when balanced or unknown.
 */
export function pairingNote(gpuText: string, cpuText: string): string | null {
  const g = gpuRating(gpuText), c = cpuRating(cpuText);
  if (g == null || c == null) return null;
  if (g >= 75 && c < 72)
    return "Heads up: this CPU may hold back the graphics card in CPU-heavy games, especially at 1080p. At 1440p and 4K the gap mostly disappears.";
  if (c >= 90 && g < 30)
    return "The CPU is far stronger than the graphics card, so a GPU upgrade later would give a big boost.";
  return null;
}
