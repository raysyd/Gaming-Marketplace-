"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import type { SoldListing } from "@/lib/market-data";

const POLL_MS = 25_000;

/**
 * Homepage "just sold" ticker. Server-rendered from the same
 * getRecentlySold() (lib/market-data.ts) for the first paint — `initial`
 * — then polls /api/recently-sold (the same cached query) to pick up new
 * sales. Deliberately not a raw postgres_changes
 * subscription on `orders`: that table's RLS restricts reads to the
 * buyer/seller, so a public homepage listener would receive nothing.
 * Polling is what actually works here, and stays honest about being
 * near-real-time rather than claiming push-instant.
 */
export function SoldTicker({ initial }: { initial: SoldListing[] }) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/recently-sold");
        const fresh: SoldListing[] = res.ok ? await res.json() : [];
        if (fresh.length) setItems(fresh);
      } catch {
        // Keep showing what's there; the next poll tries again.
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (!items.length) return null;

  // Rendered twice back to back so the CSS marquee can loop seamlessly;
  // the second copy is hidden from screen readers.
  const row = (hidden: boolean) =>
    items.map((s) => (
      <Link
        key={`${hidden ? "b" : "a"}-${s.listingId}`}
        href={`/product/${s.listingId}/${s.slug}`}
        tabIndex={hidden ? -1 : undefined}
        aria-hidden={hidden || undefined}
        className="spec shrink-0 whitespace-nowrap text-muted transition hover:text-ink"
      >
        <span className="live-dot mr-2 align-middle" aria-hidden="true" />
        <span className="text-ink">{s.title}</span> sold for{" "}
        <span className="font-semibold text-good">{money(s.price)}</span>
      </Link>
    ));

  return (
    <div className="ticker border-y border-line bg-paper py-2.5">
      <div className="ticker-track flex w-max gap-10 px-4">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
