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

  // Rendered twice back to back so the CSS marquee can loop seamlessly;
  // the second copy is hidden from screen readers.
  const row = (hidden: boolean) =>
    items.map((s) => (
      <Link
        key={`${hidden ? "b" : "a"}-${s.listingId}`}
        href={`/product/${s.listingId}/${s.slug}`}
        tabIndex={hidden ? -1 : undefined}
        aria-hidden={hidden || undefined}
        className="shrink-0 whitespace-nowrap text-[13px] text-[#9aa59d] transition hover:text-white"
      >
        <span className="tag-label mr-2 text-[#d4a73a]">Sold</span>
        <span className="text-[#f3efe6]">{s.title}</span>{" "}
        <span className="font-semibold text-[#5fd0a0]">{money(s.price)}</span>
      </Link>
    ));

  return (
    <div className="flex items-center bg-chrome">
      <span className="z-10 hidden shrink-0 items-center gap-2 border-r border-white/10 py-3 pl-4 pr-4 text-[12.5px] font-semibold text-[#f3efe6] sm:inline-flex lg:pl-8">
        <span className="live-dot" aria-hidden="true" />
        Just sold
      </span>
      <div className="ticker flex-1 py-3">
      <div className="ticker-track flex w-max gap-12 px-4">
        {row(false)}
        {row(true)}
      </div>
      </div>
    </div>
  );
}
