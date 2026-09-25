import type { Listing } from "@/lib/types";
import { SpecIcon } from "./SpecIcon";

/** The signature element: a listing's specs read like a spec sheet, not a blurb. */
export function SpecStrip({
  specs,
  max = 4,
}: {
  specs: Listing["specs"];
  max?: number;
}) {
  return (
    <dl className="flex flex-wrap gap-1">
      {specs.slice(0, max).map((s) => (
        <div
          key={s.label}
          className="spec flex items-center gap-1 rounded-md border border-line bg-paper px-1.5 py-0.5"
        >
          <SpecIcon label={s.label} size={12} />
          <dt className="text-muted">{s.label}</dt>
          <dd className="font-medium text-ink">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FpsBar({ fps }: { fps: number }) {
  const pct = Math.min(100, (fps / 280) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Est. 1080p high</span>
        <span className="text-[13px] font-semibold tabular-nums text-ink">{fps} fps</span>
      </div>
      <div className="perf-bar mt-1.5">
        <span className="perf-fill perf-value" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
