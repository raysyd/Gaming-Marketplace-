"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

export type CartItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  qty: number;
  sellerId: string;
  shipsFree: boolean;
};

type Ctx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (id: string) => void;
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

  const add: Ctx["add"] = (item) =>
    setItems((prev) =>
      prev.some((i) => i.id === item.id)
        ? prev
        : [...prev, { ...item, qty: 1 }]
    );

  const value: Ctx = {
    items,
    add,
    remove: (id) => setItems((p) => p.filter((i) => i.id !== id)),
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
