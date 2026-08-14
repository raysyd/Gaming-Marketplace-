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

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(BRAND.locale, {
    hour: "numeric",
    minute: "2-digit",
  });
