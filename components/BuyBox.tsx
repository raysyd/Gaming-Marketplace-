"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { useCart } from "./CartProvider";
import { useAuth } from "./AuthProvider";

export function BuyBox({ listing }: { listing: Listing }) {
  const { add } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offer, setOffer] = useState(Math.round(listing.price * 0.92).toString());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ownListing = user?.id === listing.sellerId;

  const addToCart = () => {
    add({ id: listing.id, title: listing.title, price: listing.price });
    setAdded(true);
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
    <div className="rounded-[10px] border border-line bg-card p-5">
      <div className="flex items-end gap-3">
        <span className="display text-[34px]">{money(listing.price)}</span>
        {listing.compareAt && (
          <span className="spec pb-2 text-muted">
            <span className="line-through">{money(listing.compareAt)}</span>{" "}
            <span className="font-semibold text-deal">
              save {money(listing.compareAt - listing.price)}
            </span>
          </span>
        )}
      </div>

      <p className="spec mt-1 text-muted">
        {listing.shipsFree ? "Free shipping" : "Shipping calculated at checkout"} ·{" "}
        {listing.location}
      </p>

      <div className="mt-4 space-y-2">
        <button
          onClick={addToCart}
          className="w-full rounded-md bg-deal py-3 text-[14px] font-semibold text-white transition hover:brightness-110"
        >
          {added ? "Added to cart" : "Add to cart"}
        </button>
        {added && (
          <button
            onClick={() => router.push("/cart")}
            className="w-full rounded-md bg-ink py-3 text-[14px] font-semibold text-white transition hover:bg-chrome-2"
          >
            Go to cart
          </button>
        )}
        <button
          onClick={() => router.push(`/messages?listing=${listing.id}`)}
          className="w-full rounded-md border border-ink/20 py-3 text-[14px] font-semibold transition hover:border-ink/50"
        >
          Message {listing.sellerName.split(" ")[0]}
        </button>
        {listing.acceptsOffers && !ownListing && !offering && (
          <button
            onClick={() => setOffering(true)}
            className="w-full rounded-md border border-line py-3 text-[13px] font-medium text-muted transition hover:border-ink/40 hover:text-ink"
          >
            Make an offer
          </button>
        )}
      </div>

      {offering && (
        <div className="mt-4 rounded-md border border-line bg-paper p-3">
          <label htmlFor="offer" className="eyebrow">
            Your offer
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="offer"
              value={offer}
              onChange={(e) => setOffer(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className="w-full rounded border border-line px-3 py-2 text-[14px]"
            />
            <button
              onClick={sendOffer}
              disabled={busy}
              className="whitespace-nowrap rounded bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send offer"}
            </button>
          </div>
          {error && <p className="spec mt-2 text-deal">{error}</p>}
          <p className="spec mt-2 text-muted">
            The seller has 48 hours to accept. Nothing is charged until they do.
          </p>
        </div>
      )}

      <div className="mt-5 space-y-2 border-t border-line pt-4">
        {[
          [
            "Payment held until delivery",
            `${BRAND.name} keeps the money until you confirm the item arrived.`,
          ],
          [
            "Not as described? Send it back",
            "Report within 3 days of delivery for a full refund.",
          ],
        ].map(([t, b]) => (
          <div key={t}>
            <p className="text-[13px] font-semibold text-trust">{t}</p>
            <p className="spec text-muted">{b}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
