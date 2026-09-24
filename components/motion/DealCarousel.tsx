"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { FpsBar } from "@/components/SpecStrip";
import { SpecGrid } from "@/components/ProductCard";

const DUR = 5500;

/**
 * Hero deal card that rotates through the biggest savings. Progress bars
 * show what's coming and are clickable; hovering pauses it and tilts the
 * card toward the cursor.
 */
export function DealCarousel({ deals }: { deals: Listing[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const n = deals.length;

  const next = useCallback(() => setI((v) => (v + 1) % n), [n]);

  useEffect(() => {
    if (paused || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(next, DUR);
    return () => clearTimeout(t);
  }, [i, paused, n, next]);

  if (!n) return null;

  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    setPaused(false);
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="deal-stage" onMouseEnter={() => setPaused(true)} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={cardRef} className="deal-card">
        <span className="deal-shine" aria-hidden="true" />
        {/* Every deal is rendered into the same grid cell and only the current
            one is visible, so the card is always as tall as the tallest deal
            and the page never jumps when it rotates. */}
        <div style={{ display: "grid" }}>
          {deals.map((d, k) => (
          <Link
            key={d.id}
            href={`/product/${d.id}/${d.slug}`}
            className="block"
            style={{ gridArea: "1 / 1", visibility: k === i ? "visible" : "hidden" }}
            aria-hidden={k !== i || undefined}
            tabIndex={k === i ? undefined : -1}
          >
          <div className="relative overflow-hidden rounded-md bg-ink">
            <div className={k === i ? "deal-swap" : undefined}>
              <ProductImage
                src={d.image}
                alt={d.title}
                category={d.category}
                seed={d.id}
                className="aspect-[4/3] w-full"
              />
            </div>
            {d.compareAt && (
              <span className="deal-badge">
                Save {money(d.compareAt - d.price)}
              </span>
            )}
          </div>
          <div className={`p-3 ${k === i ? "deal-swap" : ""}`} style={{ animationDelay: "60ms" }}>
            <p className="eyebrow text-deal">Biggest savings right now · {k + 1}/{n}</p>
            <h2 className="mt-1 line-clamp-1 text-[16px] font-semibold leading-snug">{d.title}</h2>
            <SpecGrid listing={d} />
            {d.fps1080p && (
              <div className="mt-4">
                <FpsBar fps={d.fps1080p} />
              </div>
            )}
            <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
              <div>
                <div className="display text-[30px]">{money(d.price)}</div>
                {d.compareAt && (
                  <div className="spec text-muted">
                    <span className="line-through">{money(d.compareAt)}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="spec text-muted">{d.sellerName}</div>
                <div className="spec font-medium text-muted">
                  {d.sellerReviewCount > 0 ? (
                    <span className="text-good">★ {d.sellerRating.toFixed(1)} ({d.sellerReviewCount})</span>
                  ) : (
                    "No reviews yet"
                  )}
                </div>
              </div>
            </div>
          </div>
          </Link>
          ))}
        </div>
      </div>
      {n > 1 && (
        <div className="mt-3 flex gap-1.5" role="tablist" aria-label="Deals">
          {deals.map((x, k) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={`Show deal ${k + 1}`}
              onClick={() => setI(k)}
              className="deal-bar"
            >
              <span
                key={k === i ? `on-${i}` : "off"}
                className={k === i ? "is-on" : k < i ? "is-done" : ""}
                style={{ animationDuration: `${DUR}ms`, animationPlayState: paused ? "paused" : "running" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
