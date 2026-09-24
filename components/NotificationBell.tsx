"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";
import {
  NOTIFICATION_COLUMNS,
  demoNotifications,
  notificationHref,
  notificationParts,
  shortAge,
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications";
import s from "./NotificationBell.module.css";

/**
 * Header bell with a red unread count. Clicking it slides a full-height
 * notifications panel in from the right (like Jawa's): "…" menu with
 * "Mark all as read" / "Show unread only", a close button, rows split into
 * New and Earlier, and an empty state when there's nothing to show.
 * Live: subscribes to the user's notification rows, so new ones appear
 * (and the bell rings) without a refresh.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [ring, setRing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const demo = !hasSupabase;

  useEffect(() => setMounted(true), []);

  // Load + subscribe
  useEffect(() => {
    if (demo) {
      setItems(demoNotifications());
      return;
    }
    if (!user) {
      setItems([]);
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    let alive = true;
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (alive && data) setItems(data as AppNotification[]);
      });
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as AppNotification;
          if (!row?.id) return;
          setItems((prev) => [row, ...prev.filter((p) => p.id !== row.id)].slice(0, 50));
          if (!row.read_at) {
            setRing(true);
            setTimeout(() => setRing(false), 900);
          }
        }
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [demo, user]);

  const close = useCallback(() => {
    setMenu(false);
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  }, []);

  // Escape closes; focus the close button when the panel opens.
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)));
      if (demo) return;
      const supabase = createClient();
      await supabase?.from("notifications").update({ read_at: now }).in("id", ids);
    },
    [demo]
  );

  // Signed-out visitors on a real deployment have nothing to be notified about.
  if (!demo && !user) return null;

  const unread = items.filter((n) => !n.read_at);
  const shown = unreadOnly ? unread : items;
  const fresh = shown.filter((n) => !n.read_at);
  const earlier = shown.filter((n) => n.read_at);

  const openItem = (n: AppNotification) => {
    markRead([n.id]);
    close();
    router.push(notificationHref(n));
  };

  const panel = (
    <>
      <div className={s.backdrop} onClick={close} aria-hidden="true" />
      <aside className={`${s.drawer} ${closing ? s.drawerOut : ""}`} role="dialog" aria-modal="false" aria-label="Notifications">
        <div className={s.head}>
          <h2 className={s.title}>Notifications</h2>
          <div className={s.menuWrap}>
            <button
              type="button"
              className={`${s.iconBtn} ${menu ? s.iconBtnOn : ""}`}
              onClick={() => setMenu((v) => !v)}
              aria-label="Notification options"
              aria-expanded={menu}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            </button>
            <button ref={closeBtnRef} type="button" className={s.iconBtn} onClick={close} aria-label="Close notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            {menu && (
              <div className={s.menu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={s.menuItem}
                  disabled={!unread.length}
                  onClick={() => { markRead(unread.map((n) => n.id)); setMenu(false); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4 4L19 7" /></svg>
                  Mark all as read
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={s.menuItem}
                  onClick={() => { setUnreadOnly((v) => !v); setMenu(false); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /></svg>
                  {unreadOnly ? "Show all notifications" : "Show unread only"}
                </button>
              </div>
            )}
          </div>
        </div>
        {unreadOnly && (
          <p className={s.filterNote}>
            Showing unread only · <button type="button" onClick={() => setUnreadOnly(false)}>Show all</button>
          </p>
        )}

        {shown.length === 0 ? (
          <div className={s.empty}>
            <MailboxArt />
            <p className={s.emptyText}>
              {unreadOnly ? "You're all caught up. No unread notifications." : "You don't have any notifications at this time"}
            </p>
          </div>
        ) : (
          <div className={s.scroll}>
            {fresh.length > 0 && <Section title="New" items={fresh} onOpen={openItem} />}
            {earlier.length > 0 && <Section title="Earlier" items={earlier} onOpen={openItem} />}
          </div>
        )}
      </aside>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
        aria-expanded={open}
        title="Notifications"
        className={`${s.bell} ${open ? s.bellOpen : ""} ${ring ? s.ringing : ""}`}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {unread.length > 0 && (
          <span className={s.count} aria-hidden="true">
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>
      {/* Portalled to <body> so the sticky header can't clip or stack over it. */}
      {mounted && open && createPortal(panel, document.body)}
    </>
  );
}

function Section({ title, items, onOpen }: { title: string; items: AppNotification[]; onOpen: (n: AppNotification) => void }) {
  return (
    <div>
      <h3 className={s.section}>{title}</h3>
      <ul className={s.list}>
        {items.map((n, i) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className={`${s.row} ${n.read_at ? "" : s.unread}`}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <Avatar n={n} />
              <span className={s.text}>
                <Sentence n={n} />
                <span className={`${s.age} ${n.read_at ? "" : s.ageNew}`}>{shortAge(n.created_at)}</span>
              </span>
              {!n.read_at && <span className={s.dot} aria-label="Unread" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sentence({ n }: { n: AppNotification }) {
  const { parts, quote } = notificationParts(n);
  return (
    <>
      {parts.map((p, i) => (p.strong ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}
      {quote && <span className={s.quote}>&ldquo;{quote}&rdquo;</span>}
    </>
  );
}

const BADGE: Record<NotificationKind, { bg: string; path: React.ReactNode }> = {
  message: { bg: "#5a39d6", path: <path d="M4 5h16v11H9l-5 4z" fill="#fff" stroke="none" /> },
  offer: { bg: "#0d8055", path: <path d="M12 4v16M16 7.5c-1-1.2-2.4-1.8-4-1.8-2.2 0-4 1.1-4 3s1.8 2.6 4 3.1 4 1.2 4 3.2-1.8 3.2-4 3.2c-1.7 0-3.2-.7-4.2-2" stroke="#fff" fill="none" strokeWidth="2.4" /> },
  liked_sold: { bg: "#e11d48", path: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="#fff" stroke="none" /> },
  price_drop: { bg: "#d86f00", path: <path d="M12 5v14M6 13l6 6 6-6" stroke="#fff" fill="none" strokeWidth="2.6" /> },
};

function Avatar({ n }: { n: AppNotification }) {
  const b = BADGE[n.kind];
  const listingEvent = n.kind === "liked_sold" || n.kind === "price_drop";
  const img = n.actor_avatar ?? (listingEvent ? n.listing_image : null);
  return (
    <span className={s.avatarWrap}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className={s.avatar} />
      ) : (
        <span className={`${s.avatar} ${s[`k_${n.kind}`] ?? ""}`}>
          {listingEvent ? "♡" : (n.actor_name ?? "?")[0]?.toUpperCase()}
        </span>
      )}
      <span className={s.badge} style={{ background: b.bg }}>
        <svg width="13" height="13" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{b.path}</svg>
      </span>
    </span>
  );
}

/** Line-art mailbox for the empty state (drawn here, no external image). */
function MailboxArt() {
  return (
    <svg className={s.emptyIcon} width="150" height="150" viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <path d="M22 132c18-10 34-4 50-8s30-12 46-6 18 12 24 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".35" />
      <path d="M40 130c4-10 14-14 22-12M100 130c6-8 16-10 24-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      <rect x="75" y="78" width="10" height="52" rx="2" fill="currentColor" opacity=".25" />
      <path d="M52 44h56a16 16 0 0116 16v22H52z" fill="currentColor" opacity=".18" />
      <path d="M52 44a16 16 0 0116 16v22H36V60a16 16 0 0116-16z" fill="currentColor" opacity=".38" />
      <path d="M108 58h10v-8h-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
      <path d="M108 50V40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      <path d="M30 34l-6-6M36 28l-2-8M24 42l-8-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}
