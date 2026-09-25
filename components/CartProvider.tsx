"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { BRAND } from "@/lib/brand";
import type { Category } from "@/lib/types";

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
  /** Whether *this listing* offers pickup — checkout only offers it when every item in the cart does (see app/cart/page.tsx), re-verified server-side regardless. */
  pickupAvailable?: boolean;
  /** Display-only, for the cart side panel's thumbnail. Older saved carts won't have these. */
  image?: string;
  category?: Category;
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
  /** The slide-in cart panel (components/CartDrawer.tsx). */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
/** The signed-out cart. Each account gets its own under `${KEY}.${userId}`. */
const KEY = "sidegrade.cart";

function readCart(key: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Folds `extra` into `base`. The same listing in both keeps the larger
 * quantity rather than the sum — most listings are one unit, and adding it
 * as a guest after adding it signed-in is the same intent, not two.
 */
export function mergeCarts(base: CartItem[], extra: CartItem[]): CartItem[] {
  const out = [...base];
  for (const item of extra) {
    const i = out.findIndex((o) => o.id === item.id);
    if (i === -1) out.push(item);
    else out[i] = { ...out[i], qty: Math.min(Math.max(out[i].qty, item.qty), Math.max(1, out[i].stock)) };
  }
  return out;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // One saved cart per account on this device, so signing out (or someone
  // else signing in) never shows the last person's cart. Null while auth
  // is still resolving — nothing is read or written until we know whose it is.
  const storageKey = loading ? null : user ? `${KEY}.${user.id}` : KEY;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!storageKey) return;
    let saved = readCart(storageKey);
    // Signing in carries the guest cart over into the account's cart, then
    // empties it, so it doesn't come back after signing out.
    if (storageKey !== KEY) {
      const guest = readCart(KEY);
      if (guest.length) {
        saved = mergeCarts(saved, guest);
        try {
          window.localStorage.removeItem(KEY);
        } catch {}
      }
    }
    // Anything added in the moment before auth resolved belongs to this
    // cart too. On later switches (sign-out) the old in-memory items are
    // the previous account's, so they're dropped rather than merged.
    const keepPending = firstLoad.current;
    firstLoad.current = false;
    setItems((prev) => (keepPending ? mergeCarts(saved, prev) : saved));
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!loadedKey || loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(loadedKey, JSON.stringify(items));
    } catch {}
  }, [items, loadedKey, storageKey]);

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
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
