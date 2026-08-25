"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { checkCompatibility } from "@/lib/compatibility";

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
      <div className="mx-auto max-w-[560px] px-4 py-24 text-center">
        <h1 className="display text-[28px]">Your cart is empty</h1>
        <p className="mt-2 text-[14px] text-muted">
          Find a card, a rig or a monitor and it&apos;ll show up here.
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
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <h1 className="display text-[30px]">Cart</h1>

      {compat.status === "conflict" && (
        <div className="mt-4 rounded-[10px] border border-deal bg-deal-soft px-4 py-3.5 text-[13.5px] leading-relaxed">
          <p className="font-semibold text-deal">⚠ Possible compatibility issue</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink">
            {compat.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="spec mt-2 text-muted">
            Based on what each seller listed — worth double-checking with them before you buy.
          </p>
        </div>
      )}
      {compat.status === "ok" && (
        <p className="spec mt-4 font-semibold text-good">✓ These components look compatible.</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <ul className="space-y-2">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-4 rounded-[10px] border border-line bg-card p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/product/${i.id}/${i.slug}`}
                  className="line-clamp-2 text-[14px] font-semibold hover:text-trust"
                >
                  {i.title}
                </Link>
                <p className="spec mt-1 text-muted">
                  {i.shipsFree ? "Free shipping" : "Paid shipping"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(i.id, i.qty - 1)}
                    aria-label={`Reduce quantity of ${i.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded border border-line text-[14px] hover:border-ink/40"
                  >
                    −
                  </button>
                  <span className="spec w-6 text-center">{i.qty}</span>
                  <button
                    onClick={() => setQty(i.id, i.qty + 1)}
                    disabled={i.qty >= i.stock}
                    aria-label={`Increase quantity of ${i.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded border border-line text-[14px] hover:border-ink/40 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <span className="display text-[18px]">{money(i.price * i.qty)}</span>
                <button
                  onClick={() => remove(i.id)}
                  className="spec text-muted underline hover:text-ink"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
          <button onClick={clear} className="spec text-muted underline hover:text-ink">
            Empty cart
          </button>
        </ul>

        <aside className="h-fit rounded-[10px] border border-line bg-card p-5">
          <h2 className="eyebrow">Order summary</h2>

          {pickupOffered && (
            <div className="mb-4 space-y-1.5">
              <span className="eyebrow mb-1 block">Fulfillment</span>
              {(["shipping", "pickup"] as const).map((f) => (
                <label key={f} className="flex items-center gap-1.5 text-[13.5px]">
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillment === f}
                    onChange={() => setFulfillment(f)}
                    className="accent-[var(--color-trust)]"
                  />
                  {f === "shipping" ? "Ship it to me" : "I'll pick it up"}
                </label>
              ))}
              {fulfillment === "pickup" && (
                <p className="spec text-muted">
                  Payment still stays held until you confirm you&apos;ve collected it.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 text-[13.5px]">
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
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <span>Total</span>
              <span className="display text-[20px]">{money(total)}</span>
            </div>
          </div>

          {mixedSellers && (
            <p className="spec mt-3 rounded border border-deal bg-deal-soft px-3 py-2 text-deal">
              Items in this cart are from different sellers. Remove all but
              one seller&apos;s items to check out — each order pays one
              seller.
            </p>
          )}

          <button
            onClick={checkout}
            disabled={busy || mixedSellers}
            className="rgb-ring mt-4 w-full rounded-md bg-deal py-3 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Opening checkout…" : "Checkout"}
          </button>

          {note && <p className="spec mt-3 text-deal">{note}</p>}

          <p className="spec mt-4 border-t border-line pt-3 text-trust">
            {BRAND.name} holds your payment until you confirm the item arrived.
          </p>
        </aside>
      </div>
    </div>
  );
}
