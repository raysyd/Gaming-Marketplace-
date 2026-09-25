"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { FpsBar } from "@/components/SpecStrip";
import { SpecGrid } from "@/components/ProductCard";
import { Icon } from "@/components/ui/Icon";

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
    el.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
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
        <span className="tape tape-top" aria-hidden="true" />
        <span className="deal-shine" aria-hidden="true" />
        {/* Every deal is rendered into the same grid cell and only the current
            one is visible, so the card is always as tall as the tallest deal
            and the page never jumps when it rotates. */}
        <div style={{ display: "grid" }}>
          {deals.map((d, k) => (
          <Link
            key={d.id}
            href={`/product/${d.id}/${d.slug}`}
            className="group block"
            style={{ gridArea: "1 / 1", visibility: k === i ? "visible" : "hidden" }}
            aria-hidden={k !== i || undefined}
            tabIndex={k === i ? undefined : -1}
          >
          <div className="relative overflow-hidden rounded-[10px] bg-chrome">
            <div className={k === i ? "deal-swap" : undefined}>
              <ProductImage
                src={d.image}
                alt={d.title}
                category={d.category}
                seed={d.id}
                className="aspect-[16/10] w-full"
              />
            </div>
            {d.compareAt && (
              <span className="deal-badge sticker !text-[12px]">
                Save {money(d.compareAt - d.price)}
              </span>
            )}
          </div>
          <div className={`px-2 pb-1 pt-4 ${k === i ? "deal-swap" : ""}`} style={{ animationDelay: "60ms" }}>
            <div className="flex items-center justify-between gap-3">
              <p className="tag-label text-deal">Biggest saving right now</p>
              <p className="tag-label text-muted">{String(k + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</p>
            </div>
            <h2 className="mt-2 line-clamp-1 text-[17px] font-semibold leading-snug transition-colors group-hover:text-deal">{d.title}</h2>
            <SpecGrid listing={d} />
            {d.fps1080p && (
              <div className="mt-4">
                <FpsBar fps={d.fps1080p} />
              </div>
            )}
            <div className="mt-4 flex items-end justify-between border-t-[1.5px] border-dashed border-line-strong pt-3.5">
              <div>
                <div className="display text-[34px]">{money(d.price)}</div>
                {d.compareAt && (
                  <div className="mt-1 text-[12.5px] text-muted">
                    was <span className="line-through decoration-deal/60">{money(d.compareAt)}</span>
                  </div>
                )}
              </div>
              <div className="text-right text-[12.5px]">
                <div className="font-semibold">{d.sellerName}</div>
                <div className="mt-0.5 text-muted">
                  {d.sellerReviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1"><Icon name="star" size={12} filled className="text-gold" /> {d.sellerRating.toFixed(1)} ({d.sellerReviewCount})</span>
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
        <div className="mx-auto mt-5 flex max-w-[260px] gap-1.5" role="tablist" aria-label="Deals">
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
