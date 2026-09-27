"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import s from "./FilterRail.module.css";

/**
 * Dual-thumb price slider for the shop's price filter. It drives the
 * form's own `min` / `max` number inputs (which stay, and are what the GET
 * form submits), so the filter still works with JavaScript off and either
 * control can be used. Both thumbs are native range inputs: arrow keys,
 * Page Up/Down and Home/End all work.
 */
export function PriceRange({ max, initialMin, initialMax }: { max: number; initialMin?: number; initialMax?: number }) {
  const step = max > 2000 ? 25 : 10;
  const [lo, setLo] = useState(initialMin ?? 0);
  const [hi, setHi] = useState(initialMax ?? max);
  const pct = (v: number) => `${(Math.min(v, max) / max) * 100}%`;

  const sync = (name: "min" | "max", v: number, form: HTMLFormElement | null) => {
    const input = form?.elements.namedItem(name) as HTMLInputElement | null;
    if (input) input.value = name === "min" ? (v > 0 ? String(v) : "") : v < max ? String(v) : "";
  };

  return (
    <div className={s.range}>
      <div className={s.rangeTrack} aria-hidden="true">
        <span className={s.rangeFill} style={{ left: pct(lo), right: `calc(100% - ${pct(hi)})` }} />
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={lo}
        aria-label="Minimum price"
        aria-valuetext={money(lo)}
        onChange={(e) => {
          const v = Math.min(Number(e.target.value), hi - step);
          setLo(v);
          sync("min", v, e.currentTarget.form);
        }}
      />
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={hi}
        aria-label="Maximum price"
        aria-valuetext={hi >= max ? `${money(max)} or more` : money(hi)}
        onChange={(e) => {
          const v = Math.max(Number(e.target.value), lo + step);
          setHi(v);
          sync("max", v, e.currentTarget.form);
        }}
      />
      <div className={s.rangeLabels} aria-hidden="true">
        <span>{money(lo)}</span>
        <span>{hi >= max ? `${money(max)}+` : money(hi)}</span>
      </div>
    </div>
  );
}
