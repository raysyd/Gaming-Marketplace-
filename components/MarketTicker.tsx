"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { findSub } from "@/lib/taxonomy";
import type { MarketPulse } from "@/app/api/market-pulse/route";

const POLL_MS = 60_000;

type Item = { key: string; href: string; icon: string; tone: string; body: React.ReactNode };

/**
 * Compact marquee under the header: live listing counts per category,
 * recent sales, and the two facts every buyer should know. Everything in
 * it is real (app/api/market-pulse); nothing is invented to look busy.
 * Pauses on hover and on keyboard focus, and stops for reduced motion.
 */
export function MarketTicker() {
  const [pulse, setPulse] = useState<MarketPulse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market-pulse");
        if (res.ok && alive) setPulse(await res.json());
      } catch {
        // Keep what's showing; the next poll tries again.
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items: Item[] = [];
  if (pulse?.live) {
    items.push({
      key: "live",
      href: "/shop",
      icon: "●",
      tone: "text-good",
      body: <><b className="tabular-nums">{pulse.live.toLocaleString()}</b> parts live now</>,
    });
  }
  for (const s of pulse?.topSubs ?? []) {
    const sub = findSub(s.slug);
    if (!sub) continue;
    items.push({
      key: `sub-${s.slug}`,
      href: `/shop?category=${sub.parent}&sub=${s.slug}`,
      icon: "▲",
      tone: "text-trust",
      body: <>{sub.name} <b className="tabular-nums">{s.count}</b> listed</>,
    });
  }
  for (const s of pulse?.sold ?? []) {
    items.push({
      key: `sold-${s.listingId}`,
      href: `/product/${s.listingId}/${s.slug}`,
      icon: "⚡",
      tone: "text-deal",
      body: <>{s.title} sold <b className="tabular-nums">{money(s.price)}</b></>,
    });
  }
  items.push(
    { key: "escrow", href: "/trust", icon: "🔒", tone: "text-good", body: <>Payment held until it arrives</> },
    { key: "fee", href: "/sell", icon: "◆", tone: "text-deal", body: <>{BRAND.feePercent}% fee, only when it sells</> },
  );

  // Two copies back to back so the marquee loops seamlessly; the second is
  // hidden from screen readers and the tab order.
  const row = (copy: boolean) =>
    items.map((it) => (
      <Link
        key={`${copy ? "b" : "a"}-${it.key}`}
        href={it.href}
        tabIndex={copy ? -1 : undefined}
        aria-hidden={copy || undefined}
        className="market-tick"
      >
        <span className={it.tone} aria-hidden="true">{it.icon}</span>
        <span>{it.body}</span>
      </Link>
    ));

  return (
    <div className="market-ticker" aria-label="Market activity">
      <div className="market-ticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
