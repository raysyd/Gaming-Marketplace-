"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { checkCompatibility } from "@/lib/compatibility";
import { ProductImage } from "@/components/ProductImage";

export default function CartPage() {
  const { items, remove, setQty, subtotal, shipping, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [fulfillment, setFulfillment] = useState<"shipping" | "pickup">("shipping");

  // Only offered when *every* item in the cart supports it — a single
  // checkout is one meeting with one seller, not "ship half, collect
  // half." Re-validated server-side regardless (see /api/checkout).
  const pickupOffered = items.length > 0 && items.every((i) => i.pickupAvailable);
  const effectiveShipping = fulfillment === "pickup" ? 0 : shipping;
  const total = subtotal + effectiveShipping;
  const compat = checkCompatibility(items);

  // /api/checkout creates one order row with one seller/fee/transfer
  // relationship per checkout, so a cart has to belong to one seller to
  // pay. Mixed carts aren't blocked from being *built* — that'd mean
  // guessing intent on "add to cart" — just from paying, with a clear way
  // out.
  const sellerIds = [...new Set(items.map((i) => i.sellerId))];
  const mixedSellers = sellerIds.length > 1;

  const checkout = async () => {
    if (mixedSellers) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fulfillmentMethod: pickupOffered ? fulfillment : "shipping" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setNote(
        data.message ??
          "Checkout isn't connected yet. Add your Stripe keys to switch it on."
      );
    } catch {
      setNote("Couldn't reach checkout. Try again in a moment.");
    }
    setBusy(false);
  };

  if (items.length === 0)
    return (
      <div className="mx-auto flex max-w-[560px] flex-col items-center px-4 py-24 text-center">
        <svg width="92" height="92" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted opacity-60">
          <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.9a2 2 0 002-1.5L21 8H6.2" />
          <circle cx="10" cy="20.5" r="1.3" /><circle cx="17" cy="20.5" r="1.3" />
        </svg>
        <h1 className="display mt-4 text-[30px]">Your cart is empty</h1>
        <p className="mt-2 text-[14.5px] text-muted">
          Find a card, a rig or a monitor and it&apos;ll show up here.
        </p>
        <Link href="/shop" className="btn btn-dark mt-6">
          Browse listings
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 lg:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 className="display mt-1 text-[34px]">
            Your cart <span className="text-[18px] font-medium text-muted">{items.reduce((n, i) => n + i.qty, 0)} items</span>
          </h1>
        </div>
        <Link href="/shop" className="text-[14px] font-semibold text-trust hover:underline">Continue shopping →</Link>
      </div>

      {compat.status === "conflict" && (
        <div className="mt-5 rounded-[12px] border border-deal bg-deal-soft px-5 py-4 text-[13.5px] leading-relaxed">
          <p className="font-semibold text-deal">⚠ Possible compatibility issue</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink">
            {compat.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px] text-muted">
            Based on what each seller listed. Worth double-checking with them before you buy.
          </p>
        </div>
      )}
      {compat.status === "ok" && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-good/10 px-3 py-1.5 text-[13px] font-semibold text-good">✓ These components look compatible</p>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="panel">
          <ul>
            {items.map((i, k) => (
              <li key={i.id} className={`flex gap-4 p-4 sm:p-5 ${k ? "border-t border-line" : ""}`}>
                <Link href={`/product/${i.id}/${i.slug}`} className="relative h-[90px] w-[120px] shrink-0 overflow-hidden rounded-[10px] bg-ink sm:h-[105px] sm:w-[140px]">
                  {i.category ? (
                    <ProductImage src={i.image} alt="" category={i.category} seed={i.id} showStockBadge={false} className="h-full w-full" />
                  ) : (
                    <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#4fa3ff] to-[#1f6feb] text-[26px] font-bold text-white">{i.title[0]}</span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/product/${i.id}/${i.slug}`} className="line-clamp-2 text-[15px] font-semibold leading-snug hover:text-trust">
                      {i.title}
                    </Link>
                    <span className="display shrink-0 text-[20px] text-trust">{money(i.price * i.qty)}</span>
                  </div>
                  <p className={`mt-1 text-[12.5px] ${i.shipsFree ? "text-good" : "text-muted"}`}>
                    {i.shipsFree ? "Free shipping" : "Paid shipping"}
                    {i.qty > 1 && <span className="text-muted"> · {money(i.price)} each</span>}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="inline-flex items-center overflow-hidden rounded-full border border-line">
                      <button
                        onClick={() => setQty(i.id, i.qty - 1)}
                        aria-label={`Reduce quantity of ${i.title}`}
                        className="h-8 w-9 text-[16px] transition hover:bg-paper"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-[13.5px] font-semibold tabular-nums">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.id, i.qty + 1)}
                        disabled={i.qty >= i.stock}
                        aria-label={`Increase quantity of ${i.title}`}
                        className="h-8 w-9 text-[16px] transition hover:bg-paper disabled:opacity-35"
                      >
                        +
                      </button>
                    </div>
                    <button onClick={() => remove(i.id)} className="text-[13px] text-muted underline underline-offset-2 hover:text-[#e11d48]">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <button onClick={clear} className="text-[13px] text-muted underline underline-offset-2 hover:text-ink">
              Empty cart
            </button>
          </div>
        </div>

        <aside className="panel p-5 lg:sticky lg:top-[calc(var(--header-offset,140px)+16px)]">
          <h2 className="text-[18px] font-bold">Order summary</h2>

          {pickupOffered && (
            <div className="mt-4">
              <span className="eyebrow mb-2 block">Delivery</span>
              <div className="grid grid-cols-2 gap-2">
                {(["shipping", "pickup"] as const).map((f) => (
                  <label
                    key={f}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2.5 text-[13.5px] font-medium transition ${
                      fulfillment === f ? "border-trust bg-trust-soft text-trust" : "border-line hover:border-ink/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment"
                      checked={fulfillment === f}
                      onChange={() => setFulfillment(f)}
                      className="sr-only"
                    />
                    {f === "shipping" ? "Ship it to me" : "I'll pick it up"}
                  </label>
                ))}
              </div>
              {fulfillment === "pickup" && (
                <p className="mt-2 text-[12.5px] text-muted">
                  Payment still stays held until you confirm you&apos;ve collected it.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2.5 text-[14px]">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="text-ink">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span className={effectiveShipping === 0 ? "text-good" : "text-ink"}>
                {fulfillment === "pickup" ? "Local pickup" : effectiveShipping === 0 ? "Free" : money(effectiveShipping)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3 font-semibold">
              <span className="text-[16px]">Total</span>
              <span className="display text-[26px]">{money(total)}</span>
            </div>
          </div>

          {mixedSellers && (
            <p className="mt-4 rounded-[10px] bg-deal-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-ink">
              Items in this cart are from different sellers. Remove all but
              one seller&apos;s items to check out. Each order pays one
              seller.
            </p>
          )}

          <button
            onClick={checkout}
            disabled={busy || mixedSellers}
            className="btn btn-primary btn-lg mt-4 btn-block"
          >
            {busy ? "Opening checkout…" : "Checkout securely"}
          </button>

          {note && <p className="mt-3 text-[13px] text-deal">{note}</p>}

          <ul className="mt-5 space-y-2.5 border-t border-line pt-4 text-[12.5px] text-muted">
            <li className="flex gap-2"><span className="text-good">✓</span>{BRAND.name} holds your payment until you confirm the item arrived.</li>
            <li className="flex gap-2"><span className="text-good">✓</span>The seller is paid only after delivery, minus a {BRAND.feePercent}% fee.</li>
            <li className="flex gap-2"><span className="text-good">✓</span>Card details go straight to Stripe. We never see them.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
