import { BRAND } from "./brand";

export const money = (n: number) =>
  new Intl.NumberFormat(BRAND.locale, {
    style: "currency",
    currency: BRAND.currency,
    maximumFractionDigits: 0,
  }).format(n);

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(BRAND.locale, {
    month: "short",
    day: "numeric",
  });
};

/** "Responds within 2 hours" — rounds up to the nearest sensible unit, never claims more precision than the underlying median really has. */
export const responseTimeLabel = (minutes: number) => {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.ceil(hours)} hour${hours >= 2 ? "s" : ""}`;
  return `${Math.ceil(hours / 24)} day${hours >= 48 ? "s" : ""}`;
};

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(BRAND.locale, {
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * "18h left" / "Overdue by 2h" — the seller-post and buyer-confirm
 * countdowns both read from BRAND.orderWindowHours (one constant, two call
 * sites), counting from whenever each window actually started (payment
 * for the seller, delivery for the buyer).
 */
export const deadlineLabel = (fromISO: string, hours = BRAND.orderWindowHours) => {
  const deadline = new Date(fromISO).getTime() + hours * 3600 * 1000;
  const remainingMs = deadline - Date.now();
  const remainingH = Math.abs(remainingMs) / 3600000;
  const label = remainingH < 1 ? `${Math.max(1, Math.round(remainingH * 60))}m` : `${Math.ceil(remainingH)}h`;
  return remainingMs > 0 ? `${label} left` : `Overdue by ${label}`;
};
