import { money } from "@/lib/format";
import type { PricePoint } from "@/lib/price-history-data";

const WIDTH = 320;
const HEIGHT = 96;
const PAD_X = 8;
const PAD_Y = 20;

/**
 * A step chart, not a line chart — price only ever changes at a discrete
 * moment, never gradually, so interpolating between two recorded prices
 * would draw a trend that never actually happened. Single series, so no
 * legend or categorical palette is needed (the heading names it) — see
 * the dataviz skill's "a single series needs no legend box" rule. Colour
 * stays a plain informational one already used for market-context data
 * elsewhere on this page (--color-trust), not --color-good/--color-deal,
 * which this codebase reserves for an actual value judgement ("Good
 * deal," a real discount) — a price history on its own isn't one.
 *
 * Every point is direct-labelled rather than hidden behind hover — with
 * only ever a handful of price changes, that's more legible than making
 * someone hover to see any of it, and a native <title> per point still
 * gives a zero-JS tooltip with the exact price and date.
 */
export function PriceHistoryChart({ points }: { points: PricePoint[] }) {
  if (points.length < 2) return null;

  const now = Date.now();
  const t0 = new Date(points[0].recordedAt).getTime();
  const span = Math.max(now - t0, 1);
  const x = (iso: string) => PAD_X + ((new Date(iso).getTime() - t0) / span) * (WIDTH - PAD_X * 2);

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max * 0.1 || 1;
  const y = (price: number) =>
    HEIGHT - PAD_Y - ((price - min) / range) * (HEIGHT - PAD_Y * 2);

  // Step path: hold each price flat until the moment it changes, then a
  // vertical drop/rise at that exact x — never a diagonal between two
  // different prices.
  const segments: string[] = [`M ${x(points[0].recordedAt)} ${y(points[0].price)}`];
  for (let i = 1; i < points.length; i++) {
    const prevY = y(points[i - 1].price);
    const thisX = x(points[i].recordedAt);
    segments.push(`L ${thisX} ${prevY}`, `L ${thisX} ${y(points[i].price)}`);
  }
  // Extend the final price flat to "now" — the chart should read as
  // "here's what it costs right now," not stop dead at the last change.
  const last = points[points.length - 1];
  segments.push(`L ${WIDTH - PAD_X} ${y(last.price)}`);
  const path = segments.join(" ");

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

  return (
    <div className="mt-3">
      <p className="eyebrow mb-1.5">Price history</p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-[320px]"
        role="img"
        aria-label={`Price history from ${money(points[0].price)} to ${money(last.price)}`}
      >
        <path d={path} fill="none" stroke="var(--color-trust)" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.recordedAt + i}>
            <circle cx={x(p.recordedAt)} cy={y(p.price)} r={3.5} fill="var(--color-trust)">
              <title>
                {money(p.price)} — {dateFmt(p.recordedAt)}
              </title>
            </circle>
            {/* Only label the first, last, and any point that isn't
                immediately crowded — with a handful of points this
                usually means all of them, but never overlapping text. */}
            {(i === 0 || i === points.length - 1 || points.length <= 4) && (
              <text
                x={x(p.recordedAt)}
                y={y(p.price) - 8}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                className="fill-muted"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {money(p.price)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <p className="spec text-muted">
        Listed {dateFmt(points[0].recordedAt)} at {money(points[0].price)} · now {money(last.price)}
      </p>
    </div>
  );
}
