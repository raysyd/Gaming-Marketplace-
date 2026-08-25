"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  qty: number;
  /** Available units at the time this was added — caps increment(), never trusted at checkout (see /api/checkout). */
  stock: number;
  sellerId: string;
  shipsFree: boolean;
  /** For the compatibility checker (lib/compatibility.ts) only — never trusted for anything price/stock-related, same as the rest of this display-only cart state. */
  subcategorySlug?: string;
  specs?: { label: string; value: string }[];
};

type Ctx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (id: string) => void;
  /** Clamped to [1, item.stock] — going to 0 removes the same way the Remove button does. */
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  /**
   * One flat fee if anything in the cart didn't opt into free shipping,
   * never per item — it all ships together in one parcel from one seller
   * (a cart can only hold one seller's items — see /api/checkout). Mirrors
   * the exact same rule the server applies at checkout time
   * (app/api/checkout/route.ts), so what's shown here is never able to
   * drift from what's actually charged.
   */
  shipping: number;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "sidegrade.cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Already-in-cart + "Add to cart" again bumps quantity by one (capped at
  // stock) instead of doing nothing — that's the only UI path to more than
  // one unit of the same listing, since the cart can't know a listing's
  // stock on its own.
  const add: Ctx["add"] = (item) =>
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (!existing) return [...prev, { ...item, qty: 1 }];
      return prev.map((i) =>
        i.id === item.id ? { ...i, qty: Math.min(i.qty + 1, Math.max(1, item.stock)) } : i
      );
    });

  const value: Ctx = {
    items,
    add,
    remove: (id) => setItems((p) => p.filter((i) => i.id !== id)),
    setQty: (id, qty) =>
      setItems((p) => {
        if (qty <= 0) return p.filter((i) => i.id !== id);
        return p.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, Math.max(1, i.stock)) } : i));
      }),
    clear: () => setItems([]),
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotal: items.reduce((n, i) => n + i.price * i.qty, 0),
    shipping: items.some((i) => !i.shipsFree) ? BRAND.shippingFlatRate : 0,
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
