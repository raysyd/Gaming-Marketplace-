"use client";

import { useEffect, useState } from "react";

export type Toast = { title: string; body?: string; badge?: string; achievement?: boolean };

/** Show a toast from anywhere on the client: toast({ title: "Saved" }). */
export function toast(t: Toast) {
  window.dispatchEvent(new CustomEvent<Toast>("sg:toast", { detail: t }));
}

/**
 * One-time "achievement" toasts: the first time someone does a thing, it
 * pops like a game achievement; after that it's a plain confirmation.
 * Remembered per browser, so it never nags.
 */
export function firstTime(key: string): boolean {
  try {
    const k = `sidegrade.ach.${key}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, "1");
    return true;
  } catch {
    return false;
  }
}

/** Mounted once in the root layout. Stacks up to three, each for ~4 seconds. */
export function Toaster() {
  const [items, setItems] = useState<(Toast & { id: number })[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.achievement ? 5200 : 3600);
    };
    window.addEventListener("sg:toast", on);
    return () => window.removeEventListener("sg:toast", on);
  }, []);

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.achievement ? "is-ach" : ""}`}>
          <span className="toast-badge" aria-hidden="true">
            {t.badge ?? (t.achievement ? "★" : "✓")}
          </span>
          <span className="min-w-0">
            {t.achievement && <span className="toast-kicker">Achievement unlocked</span>}
            <span className="block font-semibold">{t.title}</span>
            {t.body && <span className="block text-[13px] text-white/65">{t.body}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
