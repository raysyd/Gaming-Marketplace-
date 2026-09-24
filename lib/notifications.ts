import { slugify } from "./taxonomy";
import { money } from "./format";

/**
 * In-app notifications (the header bell). Rows are created by database
 * triggers (supabase/23-notifications.sql); this file only shapes them for
 * display. In demo mode (no Supabase) DEMO_NOTIFICATIONS stands in.
 */

export type NotificationKind = "message" | "offer" | "liked_sold" | "price_drop";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  actor_name: string | null;
  actor_avatar: string | null;
  listing_id: string | null;
  listing_title: string | null;
  listing_image: string | null;
  body: string | null;
  count: number;
  read_at: string | null;
  created_at: string;
};

export const NOTIFICATION_COLUMNS =
  "id, kind, actor_name, actor_avatar, listing_id, listing_title, listing_image, body, count, read_at, created_at";

/** Where clicking the notification goes. */
export function notificationHref(n: AppNotification): string {
  if (!n.listing_id) return n.kind === "message" || n.kind === "offer" ? "/messages" : "/wishlist";
  if (n.kind === "message" || n.kind === "offer") return `/messages?listing=${n.listing_id}`;
  return `/product/${n.listing_id}/${slugify(n.listing_title ?? "")}`;
}

/**
 * Sentence parts: `strong` pieces render bold, like Facebook's
 * "**Priya** sent you a message about **RTX 4090 Build**."
 */
export type Part = { text: string; strong?: boolean };

export function notificationParts(n: AppNotification): { parts: Part[]; quote?: string } {
  const who = n.actor_name ?? "Someone";
  const item = n.listing_title ?? "your listing";
  switch (n.kind) {
    case "message":
      return {
        parts: [
          { text: who, strong: true },
          { text: n.count > 1 ? ` sent you ${n.count} messages about ` : " sent you a message about " },
          { text: item, strong: true },
        ],
        quote: n.body ?? undefined,
      };
    case "offer":
      return {
        parts: [
          { text: who, strong: true },
          { text: " offered " },
          { text: n.body ? money(Number(n.body)) : "an amount", strong: true },
          { text: " on " },
          { text: item, strong: true },
        ],
      };
    case "liked_sold":
      return {
        parts: [
          { text: "An item you liked just sold: " },
          { text: item, strong: true },
          ...(n.body ? [{ text: ` went for ${money(Number(n.body))}.` }] : [{ text: "." }]),
        ],
      };
    case "price_drop": {
      const [was, now] = (n.body ?? "").split(">").map(Number);
      return {
        parts: [
          { text: "Price drop on an item you liked: " },
          { text: item, strong: true },
          ...(now ? [{ text: " is now " }, { text: money(now), strong: true }, { text: was ? ` (was ${money(was)}).` : "." }] : [{ text: "." }]),
        ],
      };
    }
  }
}

/** Short Facebook-style age: "now", "5m", "3h", "2d", "4w". */
export function shortAge(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

/** Demo-mode notifications, so the bell is clickable with no backend. */
export function demoNotifications(): AppNotification[] {
  return [
    { id: "dn-1", kind: "message", actor_name: "Priya S.", actor_avatar: null, listing_id: "l-003", listing_title: "RTX 4090 24GB Build — Core i5-12400F / 32GB DDR5-6000", listing_image: null, body: "Is this still available? I can pick up this weekend.", count: 2, read_at: null, created_at: ago(4) },
    { id: "dn-2", kind: "liked_sold", actor_name: null, actor_avatar: null, listing_id: "l-006", listing_title: "RTX 4060 8GB Build — Ryzen 7 7800X3D", listing_image: null, body: "2080", count: 1, read_at: null, created_at: ago(38) },
    { id: "dn-3", kind: "offer", actor_name: "Dee K.", actor_avatar: null, listing_id: "l-009", listing_title: "RX 9070 XT 16GB Build — Core Ultra 9 285K", listing_image: null, body: "2900", count: 1, read_at: null, created_at: ago(95) },
    { id: "dn-4", kind: "price_drop", actor_name: null, actor_avatar: null, listing_id: "l-012", listing_title: "NVIDIA RTX 4080 SUPER 16GB", listing_image: null, body: "1890>1590", count: 1, read_at: ago(60), created_at: ago(60 * 26) },
    { id: "dn-5", kind: "message", actor_name: "Sam T.", actor_avatar: null, listing_id: "l-015", listing_title: "AMD RX 7900 XTX 24GB", listing_image: null, body: "Thanks, parcel arrived in perfect condition!", count: 1, read_at: ago(60 * 40), created_at: ago(60 * 50) },
  ];
}
