"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = ["RTX 4090", "PS5 Slim", "Ryzen 7 7800X3D", "144Hz monitor", "gaming laptop", "Steam Deck"];
const CHIPS: [string, string][] = [
  ["Graphics cards", "/shop?category=pc-parts-and-components&sub=graphics-cards"],
  ["Gaming PCs", "/shop?category=full-systems&sub=gaming-pcs"],
  ["Under $1,000", "/shop?max=1000"],
  ["Price drops", "/shop?deals=1"],
];

/**
 * The hero's search box. The placeholder types out real example searches
 * so a first-time visitor sees what they can look for, and the chips give
 * one-tap routes into the most common shopping paths.
 */
export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hint, setHint] = useState("");
  const [focused, setFocused] = useState(false);

  // Typewriter placeholder: type, pause, erase, next example.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHint(EXAMPLES[0]);
      return;
    }
    let i = 0, n = 0, dir = 1;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = EXAMPLES[i];
      n += dir;
      setHint(word.slice(0, n));
      let delay = dir > 0 ? 70 : 35;
      if (dir > 0 && n === word.length) { dir = -1; delay = 1600; }
      else if (dir < 0 && n === 0) { dir = 1; i = (i + 1) % EXAMPLES.length; delay = 300; }
      t = setTimeout(tick, delay);
    };
    t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
        }}
        className={`hero-search ${focused ? "is-focused" : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="shrink-0 text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <label htmlFor="hero-q" className="sr-only">Search listings</label>
        <div className="relative flex-1">
          <input
            id="hero-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            className="w-full bg-transparent py-3 text-base outline-none"
          />
          {!q && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-base text-muted">
              Search &ldquo;{hint}<span className="caret" />&rdquo;
            </span>
          )}
        </div>
        <button type="submit" className="btn btn-primary rgb-ring shrink-0">
          Search
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map(([label, href], i) => (
          <button
            key={label}
            type="button"
            onClick={() => router.push(href)}
            className="chip"
            style={{ animationDelay: `${0.5 + i * 0.07}s` }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
