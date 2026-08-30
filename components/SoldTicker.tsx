"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { getRecentlySold, type SoldListing } from "@/lib/market-data";

const POLL_MS = 25_000;

/**
 * Homepage "just sold" ticker. Server-rendered from the same
 * getRecentlySold() (lib/market-data.ts) for the first paint — `initial`
 * — then polls that same public, security-definer RPC client-side to
 * pick up new sales. Deliberately not a raw postgres_changes
 * subscription on `orders`: that table's RLS restricts reads to the
 * buyer/seller, so a public homepage listener would receive nothing.
 * Polling is what actually works here, and stays honest about being
 * near-real-time rather than claiming push-instant.
 */
export function SoldTicker({ initial }: { initial: SoldListing[] }) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    const poll = async () => {
      const fresh = await getRecentlySold({ limit: 8 });
      if (fresh.length) setItems(fresh);
    };
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (!items.length) return null;

  return (
    <div className="no-scrollbar overflow-x-auto border-y border-line bg-paper py-2.5">
      <div className="flex w-max gap-6 px-4">
        {items.map((s) => (
          <Link
            key={s.listingId}
            href={`/product/${s.listingId}/${s.slug}`}
            className="spec shrink-0 whitespace-nowrap text-muted transition hover:text-ink"
          >
            🔥 <span className="text-ink">{s.title}</span> sold for{" "}
            <span className="font-semibold text-good">{money(s.price)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
