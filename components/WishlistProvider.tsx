"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Ctx = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  count: number;
};

const WishCtx = createContext<Ctx | null>(null);
const KEY = "sidegrade.wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {}
  }, [ids]);

  const value: Ctx = {
    ids,
    toggle: (id) =>
      setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    has: (id) => ids.includes(id),
    count: ids.length,
  };

  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishCtx);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
