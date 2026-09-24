import type { Listing } from "./types";

/**
 * Estimated performance scores for listing cards ("Total Performance" and
 * "Price-to-Performance").
 *
 * The tables are rough relative gaming performance, not measured results:
 * GPUs are scaled so an RTX 4090 = 100 (1440p raster, averaged across
 * common benchmark suites), CPUs so a Ryzen 7 7800X3D = 100 (gaming, not
 * productivity). They exist to rank listings against each other, so the UI
 * always labels them as estimates. Unknown parts return null and the card
 * simply hides the bars.
 *
 * Patterns are checked in order, so more specific models (e.g. "4070 ti
 * super") must come before the ones they contain ("4070 ti", "4070").
 */
const GPUS: [RegExp, number][] = [
  [/5090/, 130], [/4090/, 100], [/5080/, 83], [/4080\s*super/, 80], [/4080/, 78],
  [/7900\s*xtx/, 80], [/9070\s*xt/, 72], [/5070\s*ti/, 72], [/7900\s*xt\b/, 70],
  [/4070\s*ti\s*super/, 68], [/9070\b/, 64], [/4070\s*ti/, 62], [/3090\s*ti/, 60],
  [/5070\b/, 58], [/7900\s*gre/, 58], [/4070\s*super/, 57], [/3090/, 55],
  [/6950\s*xt/, 55], [/3080\s*ti/, 54], [/3080/, 50], [/6900\s*xt/, 50],
  [/4070\b/, 50], [/7800\s*xt/, 50], [/6800\s*xt/, 48], [/7700\s*xt/, 43],
  [/3070\s*ti/, 42], [/5060\s*ti/, 42], [/6800\b/, 42], [/9060\s*xt/, 40],
  [/3070/, 39], [/4060\s*ti/, 38], [/2080\s*ti/, 37], [/6750\s*xt/, 37],
  [/6700\s*xt/, 36], [/5060\b/, 34], [/3060\s*ti/, 34], [/2080\s*super/, 31],
  [/b580/, 30], [/4060\b/, 30], [/7600\s*xt/, 30], [/2080\b/, 29], [/7600\b/, 29],
  [/6650\s*xt/, 28], [/a770/, 28], [/2070\s*super/, 28], [/3060\b/, 26],
  [/6600\s*xt/, 26], [/a750/, 25], [/1080\s*ti/, 25], [/2070\b/, 25], [/6600\b/, 24],
  [/2060\s*super/, 23], [/2060\b/, 20], [/3050/, 18], [/1080\b/, 18],
  [/1660\s*(super|ti)/, 16], [/1070/, 14], [/1660\b/, 14], [/1650/, 10],
];

const CPUS: [RegExp, number][] = [
  [/9800x3d/, 110], [/9950x3d/, 108], [/9900x3d/, 104], [/7950x3d/, 100], [/7800x3d/, 100],
  [/14900k/, 95], [/13900k/, 93], [/9950x\b/, 93], [/14700k/, 92], [/9900x\b/, 90],
  [/285k/, 88], [/9700x/, 88], [/7950x\b/, 88], [/13700k/, 88], [/7900x\b/, 86],
  [/14600k/, 86], [/265k/, 85], [/9600x/, 85], [/7700x/, 85], [/13600k/, 84],
  [/7700\b/, 83], [/12900k/, 82], [/7600x/, 80], [/5800x3d/, 80], [/245k/, 80],
  [/12700k/, 80], [/7600\b/, 78], [/12600k/, 76], [/13500/, 72], [/5950x/, 70],
  [/5900x/, 70], [/13400/, 70], [/5800x\b/, 68], [/5700x\b/, 66], [/12400/, 66],
  [/5600x/, 62], [/5600\b/, 60], [/10700k/, 55], [/5500\b/, 55], [/11400/, 50],
  [/9700k/, 48], [/10400/, 45], [/3600/, 45], [/8700k/, 45],
];

function lookup(text: string, table: [RegExp, number][]): number | null {
  const t = text.toLowerCase();
  for (const [re, v] of table) if (re.test(t)) return v;
  return null;
}

/** Relative GPU rating (RTX 4090 = 100), or null if the model isn't recognised. */
export const gpuRating = (text: string) => lookup(text, GPUS);
/** Relative gaming CPU rating (Ryzen 7 7800X3D = 100), or null if unrecognised. */
export const cpuRating = (text: string) => lookup(text, CPUS);

const specValue = (l: Listing, labels: string[]) =>
  l.specs.find((s) => labels.includes(s.label.toLowerCase()))?.value;

export type Performance = {
  /** 0–~9000 scale. */
  score: number;
  /** Score per dollar, scaled for display (higher is better value). */
  value: number;
  kind: "system" | "gpu" | "cpu";
};

export function estimatePerformance(l: Listing): Performance | null {
  const sub = l.subcategorySlug;
  const isGpuPart = sub === "graphics-cards";
  const isCpuPart = sub === "processors";
  const gpuText = specValue(l, ["gpu", "model"]) ?? "";
  const cpuText = specValue(l, ["cpu", "model"]) ?? "";

  let score: number | null = null;
  let kind: Performance["kind"] = "system";
  if (isGpuPart) {
    const g = lookup(`${gpuText} ${l.title}`, GPUS);
    if (g != null) { score = g * 68; kind = "gpu"; }
  } else if (isCpuPart) {
    const c = lookup(`${cpuText} ${l.title}`, CPUS);
    if (c != null) { score = c * 80; kind = "cpu"; }
  } else {
    const g = lookup(gpuText || l.title, GPUS);
    const c = lookup(cpuText || l.title, CPUS);
    if (g != null && c != null) score = (g * 0.75 + c * 0.25) * 70;
  }
  if (score == null || !l.price) return null;
  score = Math.round(score);
  return { score, value: Math.round((score / l.price) * 10) / 10, kind };
}

/** Bar widths: score against the top of the scale, value against a generous ceiling. */
export const SCORE_MAX = 9000;
export const VALUE_MAX = 6;
