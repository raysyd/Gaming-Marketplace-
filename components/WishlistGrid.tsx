"use client";
import Link from "next/link";
import type { Listing } from "@/lib/types";
import { useWishlist } from "./WishlistProvider";
import { ProductCard } from "./ProductCard";
import { money } from "@/lib/format";

export function WishlistGrid({ listings }: { listings: Listing[] }) {
  const { ids } = useWishlist();
  const saved = listings.filter((l) => ids.includes(l.id));
  const total = saved.reduce((n, l) => n + l.price, 0);

  if (saved.length === 0)
    return (
      <div className="mx-auto flex max-w-[560px] flex-col items-center px-4 py-24 text-center">
        <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted opacity-60">
          <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
        </svg>
        <h1 className="display mt-4 text-[30px]">Nothing saved yet</h1>
        <p className="mt-2 text-[14px] text-muted">
          Tap the heart on any listing to keep an eye on it. We&apos;ll show you
          when the price drops.
        </p>
        <Link
          href="/shop"
          className="btn btn-dark mt-6"
        >
          Browse listings
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-6 py-10">
      <h1 className="display text-[34px]">Saved items</h1>
      <p className="spec mt-1 text-muted">
        {saved.length} saved · {money(total)} total
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {saved.map((l) => (
          <ProductCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
