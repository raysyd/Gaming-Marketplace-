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
      <div className="mx-auto max-w-[560px] px-4 py-24 text-center">
        <h1 className="display text-[28px]">Nothing saved yet</h1>
        <p className="mt-2 text-[14px] text-muted">
          Tap the heart on any listing to keep an eye on it. We&apos;ll show you
          when the price drops.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-md bg-ink px-6 py-3 text-[14px] font-semibold text-white"
        >
          Browse listings
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10">
      <h1 className="display text-[30px]">Saved items</h1>
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
