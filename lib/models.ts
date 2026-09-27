/**
 * Recognising which GPU or CPU model a listing is, so listings of the same
 * model can be compared ("the going rate for an RTX 3080"). Patterns are
 * checked in order, so the more specific name ("4070 ti super") has to
 * come before the ones it contains ("4070 ti", "4070") — the same rule as
 * lib/performance.ts.
 */
export type ModelKind = "gpu" | "cpu";
export type Model = { key: string; name: string; kind: ModelKind };

const GPU: [RegExp, string][] = [
  [/5090/, "RTX 5090"], [/4090/, "RTX 4090"], [/5080/, "RTX 5080"], [/4080\s*super/, "RTX 4080 Super"],
  [/4080/, "RTX 4080"], [/5070\s*ti/, "RTX 5070 Ti"], [/5070/, "RTX 5070"], [/4070\s*ti\s*super/, "RTX 4070 Ti Super"],
  [/4070\s*ti/, "RTX 4070 Ti"], [/4070\s*super/, "RTX 4070 Super"], [/4070/, "RTX 4070"], [/5060\s*ti/, "RTX 5060 Ti"],
  [/5060/, "RTX 5060"], [/4060\s*ti/, "RTX 4060 Ti"], [/4060/, "RTX 4060"], [/3090\s*ti/, "RTX 3090 Ti"],
  [/3090/, "RTX 3090"], [/3080\s*ti/, "RTX 3080 Ti"], [/3080/, "RTX 3080"], [/3070\s*ti/, "RTX 3070 Ti"],
  [/3070/, "RTX 3070"], [/3060\s*ti/, "RTX 3060 Ti"], [/3060/, "RTX 3060"], [/2080\s*ti/, "RTX 2080 Ti"],
  [/2070\s*super/, "RTX 2070 Super"], [/2060/, "RTX 2060"], [/1660/, "GTX 1660"], [/1080\s*ti/, "GTX 1080 Ti"],
  [/7900\s*xtx/, "RX 7900 XTX"], [/7900\s*xt\b/, "RX 7900 XT"], [/7900\s*gre/, "RX 7900 GRE"], [/9070\s*xt/, "RX 9070 XT"],
  [/9070/, "RX 9070"], [/9060\s*xt/, "RX 9060 XT"], [/7800\s*xt/, "RX 7800 XT"], [/7700\s*xt/, "RX 7700 XT"],
  [/7600/, "RX 7600"], [/6950\s*xt/, "RX 6950 XT"], [/6900\s*xt/, "RX 6900 XT"], [/6800\s*xt/, "RX 6800 XT"],
  [/6800/, "RX 6800"], [/6750\s*xt/, "RX 6750 XT"], [/6700\s*xt/, "RX 6700 XT"], [/6650\s*xt/, "RX 6650 XT"],
  [/6600/, "RX 6600"], [/b580/, "Arc B580"], [/a770/, "Arc A770"], [/a750/, "Arc A750"],
];

const CPU: [RegExp, string][] = [
  [/9800x3d/, "Ryzen 7 9800X3D"], [/9950x3d/, "Ryzen 9 9950X3D"], [/9950x/, "Ryzen 9 9950X"], [/9900x/, "Ryzen 9 9900X"],
  [/9700x/, "Ryzen 7 9700X"], [/9600x/, "Ryzen 5 9600X"], [/7950x3d/, "Ryzen 9 7950X3D"], [/7950x/, "Ryzen 9 7950X"],
  [/7900x/, "Ryzen 9 7900X"], [/7800x3d/, "Ryzen 7 7800X3D"], [/7700x/, "Ryzen 7 7700X"], [/7600x/, "Ryzen 5 7600X"],
  [/5800x3d/, "Ryzen 7 5800X3D"], [/5950x/, "Ryzen 9 5950X"], [/5900x/, "Ryzen 9 5900X"], [/5800x/, "Ryzen 7 5800X"],
  [/5700x/, "Ryzen 7 5700X"], [/5600x/, "Ryzen 5 5600X"], [/5600\b/, "Ryzen 5 5600"], [/3600/, "Ryzen 5 3600"],
  [/285k/, "Core Ultra 9 285K"], [/265k/, "Core Ultra 7 265K"], [/245k/, "Core Ultra 5 245K"], [/14900k/, "Core i9-14900K"],
  [/14700k/, "Core i7-14700K"], [/14600k/, "Core i5-14600K"], [/13900k/, "Core i9-13900K"], [/13700k/, "Core i7-13700K"],
  [/13600k/, "Core i5-13600K"], [/13400/, "Core i5-13400"], [/12900k/, "Core i9-12900K"], [/12700k/, "Core i7-12700K"],
  [/12600k/, "Core i5-12600K"], [/12400/, "Core i5-12400"],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function find(text: string, table: [RegExp, string][], kind: ModelKind): Model | null {
  const t = text.toLowerCase();
  for (const [re, name] of table) if (re.test(t)) return { key: slug(name), name, kind };
  return null;
}

/**
 * The model a single part listing is for, or null. Only graphics card and
 * processor listings are matched: a prebuilt PC that mentions "RTX 4070" is
 * a whole computer, not a comparable for the card on its own.
 */
export function modelOf(l: { title: string; subcategorySlug?: string }): Model | null {
  if (l.subcategorySlug === "graphics-cards") return find(l.title, GPU, "gpu");
  if (l.subcategorySlug === "processors") return find(l.title, CPU, "cpu");
  return null;
}
