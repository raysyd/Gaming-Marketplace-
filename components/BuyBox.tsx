"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import type { PriceStats } from "@/lib/market-data";
import type { PricePoint } from "@/lib/price-history-data";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { estimateShippingCentsForListing } from "@/lib/shipping/estimate";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { Icon } from "./ui/Icon";

export function BuyBox({
  listing,
  priceStats,
  priceHistory,
}: {
  listing: Listing;
  priceStats?: PriceStats | null;
  priceHistory?: PricePoint[];
}) {
  const { add, openDrawer } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offer, setOffer] = useState(Math.round(listing.price * 0.92).toString());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ownListing = user?.id === listing.sellerId;
  const unavailable = listing.status && listing.status !== "active" && !ownListing;

  const addToCart = () => {
    add({
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      price: listing.price,
      sellerId: listing.sellerId,
      shipsFree: listing.shipsFree,
      stock: listing.stock,
      subcategorySlug: listing.subcategorySlug,
      specs: listing.specs,
      pickupAvailable: listing.pickupAvailable,
      image: listing.image,
      category: listing.category,
    });
    setAdded(true);
    openDrawer();
  };

  const sendOffer = async () => {
    const amount = Number(offer);
    if (!amount || amount <= 0) {
      setError("Enter an amount above zero.");
      return;
    }
    if (amount > listing.price) {
      setError("That's above the asking price — just buy it now.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, amount }),
      });
      router.push(`/messages?listing=${listing.id}&offer=${amount}`);
    } catch {
      setError("Offer didn't send. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="panel relative overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="display text-[44px] leading-none tabular-nums">{money(listing.price)}</span>
        {listing.compareAt && (
          <span className="pb-1 text-[13px] text-muted">
            <span className="line-through decoration-deal/60">{money(listing.compareAt)}</span>{" "}
            <span className="sticker ml-1 !rotate-[-2deg] align-middle">
              save {money(listing.compareAt - listing.price)}
            </span>
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className={`badge ${listing.shipsFree ? "badge-green" : ""}`}>
          <Icon name="truck" size={14} />
          {listing.shipsFree ? "Free shipping" : `+ ${money(BRAND.shippingFlatRate)} shipping`}
        </span>
        <span className="badge">
          <Icon name="pin" size={14} />
          {listing.location}
        </span>
        {listing.pickupAvailable && (
          <span className="badge">
            <Icon name="handshake" size={14} />
            Local pickup available
          </span>
        )}
      </div>
      {!listing.shipsFree && (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
          Australia Post&apos;s own posted rate for something this size is about{" "}
          {money(estimateShippingCentsForListing(listing.subcategorySlug, listing.weightGrams) / 100)} —
          an estimate, not what&apos;s charged above.
        </p>
      )}

      {/* Built from real released sales in this subcategory over the last
          90 days — omitted entirely (not "0 sales") below ~5 comparable
          sales, since a range built on noise is worse than no range. */}
      {priceStats && (
        <div className="panel-inset mt-4 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]">
          <span className="text-muted">
            {BRAND.name} market value{" "}
            <b className="font-semibold text-ink">{money(priceStats.low)}–{money(priceStats.high)}</b>
          </span>
          {listing.price <= priceStats.low && (
            <span className="badge badge-green">
              <Icon name="check" size={13} strokeWidth={2.6} /> Good deal
            </span>
          )}
        </div>
      )}

      {priceHistory && <PriceHistoryChart points={priceHistory} />}

      {/* Only worth saying anything when it's informative: quiet for a
          normal single unit, a nudge when stock is getting low, and the
          sold-out branch below already covers zero. */}
      {listing.status === "active" && listing.stock > 1 && listing.stock <= 5 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-deal">
          <Icon name="flame" size={14} /> Only {listing.stock} left
        </p>
      )}
      {listing.status === "active" && listing.stock > 5 && (
        <p className="mt-3 text-[13px] text-muted">{listing.stock} in stock</p>
      )}

      <div className="mt-5 space-y-2">
        {ownListing ? (
          <p className="panel-inset px-3 py-3 text-center text-[13.5px] text-muted">
            This is your listing.
          </p>
        ) : listing.status === "sold" ? (
          <p className="panel-inset px-3 py-3 text-center text-[13.5px] font-semibold text-muted">
            Sold out
          </p>
        ) : (
          <button onClick={addToCart} className="btn btn-primary btn-lg btn-block">
            {added ? (
              <>
                <Icon name="check" size={18} strokeWidth={2.6} /> Added to cart
              </>
            ) : (
              <>
                <Icon name="bag" size={18} /> Add to cart
              </>
            )}
          </button>
        )}
        {added && !unavailable && !ownListing && (
          <button onClick={() => router.push("/cart")} className="btn btn-dark btn-block">
            Go to cart
            <Icon name="arrow-right" size={16} strokeWidth={2.4} className="btn-arrow" />
          </button>
        )}
        {!ownListing && (
          <button
            onClick={() => router.push(`/messages?listing=${listing.id}`)}
            className="btn btn-outline btn-block"
          >
            <Icon name="chat" size={17} />
            Message {listing.sellerName.split(" ")[0]}
          </button>
        )}
        {listing.acceptsOffers && !unavailable && !ownListing && !offering && (
          <button onClick={() => setOffering(true)} className="btn btn-ghost btn-block text-muted hover:text-ink">
            <Icon name="tag" size={16} />
            Make an offer
          </button>
        )}
      </div>

      {offering && (
        <div className="rise mt-4 rounded-[12px] border border-line bg-paper p-4">
          <label htmlFor="offer" className="label">
            Your offer
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted">$</span>
              <input
                id="offer"
                value={offer}
                onChange={(e) => setOffer(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="input !pl-7 tabular-nums"
              />
            </div>
            <button onClick={sendOffer} disabled={busy} className="btn btn-dark h-[46px]">
              {busy ? <span className="spinner" aria-hidden="true" /> : null}
              {busy ? "Sending…" : "Send offer"}
            </button>
          </div>
          {error && <p className="mt-2 text-[12.5px] font-medium text-danger">{error}</p>}
          <p className="hint">
            The seller has 48 hours to accept. Nothing is charged until they do.
          </p>
        </div>
      )}

      {/*
        The full escrow explanation lives on the checkout page, /trust and
        the homepage — repeating it here too was pure wallpaper on every
        single listing. One line, doing just enough to reassure without
        reciting the whole policy again.
      */}
      <div className="mt-5 flex items-start gap-3 border-t-[1.5px] border-dashed border-line-strong pt-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-trust-soft text-trust">
          <Icon name="lock" size={16} />
        </span>
        <p className="text-[13px] leading-relaxed text-muted">
          Payment is held until delivery is confirmed.{" "}
          <Link href="/trust" className="inline-link">
            How buyer protection works
          </Link>
        </p>
      </div>
    </div>
  );
}
