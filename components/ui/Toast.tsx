"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Link from "next/link";

type Tone = "default" | "good";
type ToastItem = {
  id: number;
  message: string;
  tone: Tone;
  action?: { label: string; href: string };
  leaving?: boolean;
};

const ToastCtx = createContext<(message: string, opts?: { tone?: Tone; action?: { label: string; href: string } }) => void>(
  () => {}
);

/**
 * Small, bottom-centred confirmation toasts ("Saved", "Added to cart").
 * Announced politely to screen readers; each one leaves on its own after
 * a few seconds. Deliberately no queue UI or close buttons — they're
 * confirmations, not decisions.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const push = useCallback<React.ContextType<typeof ToastCtx>>((message, opts) => {
    const id = next.current++;
    setItems((list) => [...list.slice(-2), { id, message, tone: opts?.tone ?? "default", action: opts?.action }]);
    setTimeout(() => setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t))), 3200);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.leaving ? "is-leaving" : ""}`}>
            <span className={`toast-dot ${t.tone === "good" ? "is-good" : ""}`} aria-hidden="true" />
            <span>{t.message}</span>
            {t.action && <Link href={t.action.href}>{t.action.label}</Link>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
