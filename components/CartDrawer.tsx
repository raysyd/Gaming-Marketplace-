"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { ProductImage } from "./ProductImage";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import s from "./CartDrawer.module.css";

/**
 * Header cart button + slide-in cart panel. The button opens the panel
 * instead of navigating; "Go to cart" takes you to the full /cart page
 * (fulfilment choice, compatibility check, checkout). Adding an item from a
 * listing also opens it (BuyBox calls openDrawer).
 */
export function CartDrawer() {
  const { items, count, subtotal, shipping, remove, setQty, drawerOpen, openDrawer, closeDrawer } = useCart();
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bump, setBump] = useState(false);
  const prevCount = useRef(count);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Little pop on the count when something is added.
  useEffect(() => {
    if (count > prevCount.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 450);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      closeDrawer();
      setClosing(false);
    }, 200);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setClosing(true);
        setTimeout(() => { closeDrawer(); setClosing(false); }, 200);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  const go = (href: string) => {
    closeDrawer();
    router.push(href);
  };

  const mixedSellers = new Set(items.map((i) => i.sellerId)).size > 1;

  const panel = (
    <>
      <div className={s.backdrop} onClick={close} aria-hidden="true" />
      <aside className={`${s.drawer} ${closing ? s.drawerOut : ""}`} role="dialog" aria-modal="false" aria-label="Your cart">
        <div className={s.head}>
          <h2 className={s.title}>
            Your cart{count > 0 && <span>{count} {count === 1 ? "item" : "items"}</span>}
          </h2>
          <button ref={closeBtnRef} type="button" className={s.iconBtn} onClick={close} aria-label="Close cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className={s.empty}>
            <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" opacity=".55">
              <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.9a2 2 0 002-1.5L21 8H6.2" />
              <circle cx="10" cy="20.5" r="1.3" /><circle cx="17" cy="20.5" r="1.3" />
            </svg>
            <p className={s.emptyTitle}>Your cart is empty</p>
            <p className={s.emptyText}>Find something good and it&apos;ll show up here.</p>
            <button type="button" className={s.browse} onClick={() => go("/shop")}>Browse listings</button>
          </div>
        ) : (
          <>
            <ul className={s.scroll} style={{ listStyle: "none", margin: 0 }}>
              {items.map((i, k) => (
                <li key={i.id} className={s.item} style={{ animationDelay: `${Math.min(k, 6) * 40}ms` }}>
                  <div className={s.thumb}>
                    {i.category ? (
                      <ProductImage src={i.image} alt="" category={i.category} seed={i.id} showStockBadge={false} className="h-full w-full" />
                    ) : (
                      <span className={`${s.thumb} ${s.thumbBlank}`}>{i.title[0]}</span>
                    )}
                  </div>
                  <div className={s.info}>
                    <Link href={`/product/${i.id}/${i.slug}`} onClick={() => closeDrawer()} className={s.name}>
                      {i.title}
                    </Link>
                    <div className={s.price}>{money(i.price * i.qty)}</div>
                    <div className={s.controls}>
                      <div className={s.stepper}>
                        <button type="button" aria-label="One fewer" onClick={() => setQty(i.id, i.qty - 1)}>−</button>
                        <span aria-label="Quantity">{i.qty}</span>
                        <button type="button" aria-label="One more" disabled={i.qty >= Math.max(1, i.stock)} onClick={() => setQty(i.id, i.qty + 1)}>+</button>
                      </div>
                      <button type="button" className={s.remove} onClick={() => remove(i.id)}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
              {mixedSellers && (
                <li className={s.warn}>
                  These items are from different sellers. You&apos;ll check out one seller at a time on the cart page.
                </li>
              )}
            </ul>

            <div className={s.foot}>
              <div className={s.line}><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className={s.line}><span>Shipping</span><span>{shipping ? money(shipping) : "Free"}</span></div>
              <div className={`${s.line} ${s.total}`}><span>Total</span><span>{money(subtotal + shipping)}</span></div>
              <button type="button" className={s.go} onClick={() => go("/cart")}>
                Go to cart
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
              <button type="button" className={s.keep} onClick={close}>Continue shopping</button>
              <p className={s.note}>Payment is held by {BRAND.name} until you confirm the item arrived.</p>
            </div>
          </>
        )}
      </aside>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => (drawerOpen ? close() : openDrawer())}
        aria-label={`Cart, ${count} items`}
        aria-expanded={drawerOpen}
        title="Cart"
        className={s.cartBtn}
      >
        <span className="text-base leading-none" aria-hidden="true">🛒</span>
        <span className={`${s.cartCount} ${bump ? s.bump : ""}`}>{count}</span>
      </button>
      {mounted && drawerOpen && createPortal(panel, document.body)}
    </>
  );
}
