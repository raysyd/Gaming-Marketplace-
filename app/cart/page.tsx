"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";

export default function CartPage() {
  const { items, remove, subtotal, clear } = useCart();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const shipping = subtotal > 0 ? 0 : 0;
  const total = subtotal + shipping;

  const checkout = async () => {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <ul className="space-y-2">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-4 rounded-[10px] border border-line bg-card p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/product/${i.id}/x`}
                  className="line-clamp-2 text-[14px] font-semibold hover:text-trust"
                >
                  {i.title}
                </Link>
                <p className="spec mt-1 text-muted">Qty {i.qty}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
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
          <div className="mt-3 space-y-2 text-[13.5px]">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="text-ink">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span className="text-good">Free</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <span>Total</span>
              <span className="display text-[20px]">{money(total)}</span>
            </div>
          </div>

          <button
            onClick={checkout}
            disabled={busy}
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
