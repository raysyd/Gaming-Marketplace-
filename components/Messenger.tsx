"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Conversation, Listing, Message } from "@/lib/types";
import { clockTime, money, timeAgo } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";
import { useAuth } from "./AuthProvider";
import {
  CHAT_IMAGE_BUCKET,
  CHAT_IMAGE_TYPES,
  chatImagePath,
  chatImageProblem,
} from "@/lib/chat-images";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Demo-mode buyer id — matches lib/demo.ts's DEMO_USER, unused once signed in. */
const DEMO_ME = "u-you";

export function Messenger({
  initialConversations,
  initialMessages,
  listings,
}: {
  initialConversations: Conversation[];
  initialMessages: Record<string, Message[]>;
  listings: Listing[];
}) {
  const { user, loading: authLoading } = useAuth();
  // Real conversations/messages carry the signed-in user's actual id as
  // sender_id/buyer_id/seller_id. Falling back to the demo id whenever
  // `user` was falsy — which is also true for the split second before
  // auth.getUser() resolves on a real, signed-in session — meant every
  // message briefly rendered as if it belonged to the other person, since
  // "u-you" never matches a real uuid. Only fall back to the demo id in
  // actual demo mode; a real deployment either knows who ME is or isn't
  // ready to render messages as "mine" yet.
  const ME = hasSupabase ? (user?.id ?? null) : DEMO_ME;
  const activeIdRef = useRef<string | null>(null);

  const params = useSearchParams();
  const deepListing = params.get("listing");
  const deepOffer = params.get("offer");

  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState(initialMessages);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Storage path -> signed URL for photos in the thread (the bucket is
  // private; see supabase/24-chat-images.sql).
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  // Newest message timestamp on screen — where a realtime reconnect
  // catches up from.
  const latestRef = useRef<string>(
    Object.values(initialMessages)
      .flat()
      .reduce((max, m) => (m.createdAt > max ? m.createdAt : max), "")
  );
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  /* Arriving from a listing: open that thread, creating it if it's new. */
  useEffect(() => {
    if (!deepListing || !ME) return;
    const listing = listings.find((l) => l.id === deepListing);
    if (!listing) {
      // Sold, taken down, or a bad link — say so instead of doing nothing.
      if (!initialConversations.some((c) => c.listingId === deepListing))
        setSendError("That listing isn't available to message about any more.");
      else setActiveId(initialConversations.find((c) => c.listingId === deepListing)!.id);
      return;
    }

    const convId = `c-${deepListing}`;

    // Idempotent: React runs effects twice in development, and the user can
    // land on the same deep link more than once. Both paths must be safe to
    // repeat, or the conversation gets added twice under one key.
    setConversations((prev) => {
      const existing = prev.find((c) => c.listingId === deepListing);
      if (existing) return prev;
      const conv: Conversation = {
        id: convId,
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: "",
        buyerId: ME,
        sellerId: listing.sellerId,
        otherPartyName: listing.sellerName,
        lastMessage: "",
        updatedAt: new Date().toISOString(),
        unread: 0,
      };
      return [conv, ...prev];
    });

    const target =
      initialConversations.find((c) => c.listingId === deepListing)?.id ?? convId;

    // In real (Supabase) mode, POST /api/offers already persisted both the
    // offer row and its announcing message before this navigation — the
    // fresh server render that produced initialMessages already has it, so
    // synthesizing a second, unlinked copy here would just duplicate the
    // bubble. Demo mode has no backend to have persisted anything, so it's
    // the one case this still fabricates locally.
    if (!hasSupabase) {
      setMessages((prev) => {
        const thread = prev[target] ?? [];
        if (!deepOffer) return prev[target] ? prev : { ...prev, [target]: thread };

        // Deterministic id, so a repeated run replaces rather than appends.
        const offerId = `offer-${deepListing}-${deepOffer}`;
        if (thread.some((m) => m.id === offerId)) return prev;

        return {
          ...prev,
          [target]: [
            ...thread,
            {
              id: offerId,
              conversationId: target,
              senderId: ME,
              body: "Offer sent",
              kind: "offer",
              offerAmount: Number(deepOffer),
              offerStatus: "pending",
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
    }

    setActiveId(target);
    setShowListOnMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepListing, deepOffer, ME]);

  /*
   * Live updates — one Supabase Realtime subscription for the whole inbox,
   * not per open thread, and no polling. Realtime applies the same RLS
   * "participants read messages"/"participants read conversations" policies
   * to what it broadcasts, so this only ever receives rows ME is a party to.
   *
   * Two gaps made chat feel broken even with the subscription in place:
   * - A socket that dropped (laptop asleep, phone tab backgrounded) missed
   *   everything sent meanwhile until a full reload. On every reconnect,
   *   and when the tab becomes visible again, this now fetches whatever
   *   arrived after the newest message already on screen.
   * - Every event from ME was ignored, so a message sent from another tab
   *   or device never appeared here. Own messages are now merged too, the
   *   echo of this tab's own send replacing its optimistic copy.
   */
  useEffect(() => {
    if (!hasSupabase || !ME) return;
    const supabase = createClient();
    if (!supabase) return;

    const toMessage = (r: Record<string, unknown>): Message => ({
      id: String(r.id),
      conversationId: String(r.conversation_id),
      senderId: String(r.sender_id),
      body: String(r.body ?? ""),
      kind: (r.kind as Message["kind"]) ?? "text",
      offerAmount: r.offer_amount ? Number(r.offer_amount) : undefined,
      offerId: r.offer_id ? String(r.offer_id) : undefined,
      imageUrl: r.image_url ? String(r.image_url) : undefined,
      createdAt: String(r.created_at),
    });

    const applyMessage = (incoming: Message) => {
      const convId = incoming.conversationId;
      const mine = incoming.senderId === ME;
      if (!latestRef.current || incoming.createdAt > latestRef.current) latestRef.current = incoming.createdAt;

      setMessages((p) => {
        const list = p[convId] ?? [];
        if (list.some((m) => m.id === incoming.id)) return p;
        if (mine) {
          // This tab's own send coming back: swap the optimistic bubble for
          // the real row rather than showing it twice.
          const i = list.findIndex((m) => m.id.startsWith("m-") && m.body === incoming.body);
          if (i >= 0) {
            const next = [...list];
            next[i] = incoming;
            return { ...p, [convId]: next };
          }
        }
        return { ...p, [convId]: [...list, incoming] };
      });
      setConversations((p) => {
        if (!p.some((c) => c.id === convId)) return p; // new-thread case, handled below
        return p
          .map((c) =>
            c.id === convId
              ? {
                  ...c,
                  lastMessage: incoming.kind === "image" ? "Photo" : incoming.body,
                  updatedAt: incoming.createdAt,
                  unread: mine || convId === activeIdRef.current ? 0 : c.unread + 1,
                }
              : c
          )
          .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      });
      if (!mine && convId === activeIdRef.current) {
        fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convId }),
        }).catch(() => {});
      }
    };

    // Whatever landed while the socket wasn't listening.
    const catchUp = async () => {
      if (!latestRef.current) return;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .gt("created_at", latestRef.current)
        .order("created_at", { ascending: true })
        .limit(200);
      for (const r of data ?? []) applyMessage(toMessage(r));
    };

    let everSubscribed = false;
    const channel = supabase
      .channel(`inbox:${ME}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => applyMessage(toMessage(payload.new as Record<string, unknown>))
      )
      .on(
        // A brand-new thread someone else started with ME (only relevant
        // to sellers — a buyer already has their own thread in state the
        // moment they send its first message) has no row in `conversations`
        // client-side yet, so the INSERT above drops it. Pick it up here
        // instead, using the listing data already loaded in `listings`.
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        async (payload) => {
          const r = payload.new as Record<string, unknown>;
          const convId = String(r.id);
          if (r.buyer_id === ME) return; // I created this one myself, already in state
          setConversations((p) => {
            if (p.some((c) => c.id === convId)) return p;
            const listing = listings.find((l) => l.id === String(r.listing_id));
            const conv: Conversation = {
              id: convId,
              listingId: String(r.listing_id ?? ""),
              listingTitle: listing?.title ?? "Listing",
              listingImage: listing?.image ?? "",
              buyerId: String(r.buyer_id),
              sellerId: String(r.seller_id),
              otherPartyName: "Buyer",
              lastMessage: String(r.last_message ?? ""),
              updatedAt: String(r.updated_at ?? new Date().toISOString()),
              unread: 0,
            };
            return [conv, ...p];
          });
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", String(r.buyer_id))
            .maybeSingle();
          if (profile?.display_name) {
            setConversations((p) =>
              p.map((c) =>
                c.id === convId ? { ...c, otherPartyName: profile.display_name } : c
              )
            );
          }
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // The first subscribe starts from the server-rendered messages;
        // every later one is a reconnect with a gap to fill.
        if (everSubscribed) catchUp();
        everSubscribed = true;
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") catchUp();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [ME, listings]);

  /*
   * Opening a thread only ever cleared the unread count in local state
   * (see the conversation-list onClick below) — read_at in Supabase was
   * never touched, so the badge came back on the next load. This is what
   * actually persists it; PATCH /api/messages no-ops harmlessly for a
   * locally-fabricated (non-uuid) id, so this is safe to fire unconditionally.
   */
  useEffect(() => {
    if (!hasSupabase || !activeId) return;
    fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId }),
    }).catch(() => {});
  }, [activeId]);

  const thread = activeId ? messages[activeId] ?? [] : [];
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );
  const activeListing = listings.find((l) => l.id === active?.listingId) ?? null;

  useEffect(() => {
    // Scroll the thread itself, never the page: scrollIntoView would also
    // scroll the window and push the header off the top on load.
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [thread.length, activeId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || !ME) return;
    setSending(true);
    const msg: Message = {
      id: `m-${Date.now()}`,
      conversationId: activeId,
      senderId: ME,
      body,
      kind: "text",
      createdAt: new Date().toISOString(),
    };
    setMessages((p) => ({ ...p, [activeId]: [...(p[activeId] ?? []), msg] }));
    setConversations((p) =>
      p
        .map((c) =>
          c.id === activeId
            ? { ...c, lastMessage: body, updatedAt: msg.createdAt, unread: 0 }
            : c
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    );
    setDraft("");
    setSendError("");
    // Take the optimistic bubble back out and restore what was typed —
    // failures used to be swallowed, leaving a message that looked sent
    // but never reached the other person.
    const fail = (reason: string) => {
      setMessages((p) => ({ ...p, [activeId]: (p[activeId] ?? []).filter((m) => m.id !== msg.id) }));
      setDraft(body);
      setSendError(reason);
    };
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          listingId: active?.listingId,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) fail(data.error ?? "Message didn't send. Try again.");
      // A brand-new thread (opened via "Message seller") only ever has a
      // locally-fabricated id up to this point — /api/messages creates
      // the real conversation row server-side and hands back its actual
      // id. Re-key local state onto that id so the next message in this
      // session (and the realtime subscription below, which listens on
      // activeId) both point at the row that's actually in Postgres.
      if (res.ok && data.conversationId && data.conversationId !== activeId) {
        const realId = data.conversationId as string;
        setMessages((p) => {
          const { [activeId]: thread, ...rest } = p;
          return { ...rest, [realId]: thread ?? [] };
        });
        setConversations((p) => p.map((c) => (c.id === activeId ? { ...c, id: realId } : c)));
        setActiveId(realId);
      }
    } catch {
      fail("Couldn't reach the server. Check your connection and try again.");
    }
    setSending(false);
  };

  // Sign any photos in the open thread that don't have a URL yet — one
  // batched request, and only for the thread actually on screen.
  useEffect(() => {
    if (!hasSupabase) return;
    const paths = thread
      .filter((m) => m.kind === "image" && m.imageUrl && !m.imageUrl.startsWith("blob:") && !signedUrls[m.imageUrl])
      .map((m) => m.imageUrl as string);
    if (!paths.length) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.storage
      .from(CHAT_IMAGE_BUCKET)
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        const next: Record<string, string> = {};
        for (const d of data ?? []) if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
        if (Object.keys(next).length) setSignedUrls((p) => ({ ...p, ...next }));
      });
  }, [thread, signedUrls]);

  const sendPhoto = async (file: File) => {
    if (!activeId || !ME) return;
    setSendError("");
    const problem = chatImageProblem(file);
    if (problem) return setSendError(problem);
    // The photo's storage folder is the conversation id, so a thread that
    // only exists locally so far needs its first text message sent first.
    if (!UUID_RE.test(activeId))
      return setSendError("Send a message first to start the conversation, then add photos.");
    const supabase = createClient();
    if (!supabase) return setSendError("Photos need Supabase Storage connected.");

    const convId = activeId;
    const preview = URL.createObjectURL(file);
    const msg: Message = {
      id: `m-${Date.now()}`,
      conversationId: convId,
      senderId: ME,
      body: "Photo",
      kind: "image",
      imageUrl: preview,
      createdAt: new Date().toISOString(),
    };
    setMessages((p) => ({ ...p, [convId]: [...(p[convId] ?? []), msg] }));
    setUploading(true);
    const fail = (reason: string) => {
      setMessages((p) => ({ ...p, [convId]: (p[convId] ?? []).filter((m) => m.id !== msg.id) }));
      setSendError(reason);
    };
    try {
      const path = chatImagePath(convId, file.type, crypto.randomUUID());
      const { error: upErr } = await supabase.storage
        .from(CHAT_IMAGE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) {
        fail(upErr.message || "Photo didn't upload. Try again.");
      } else {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convId, listingId: active?.listingId, imagePath: path }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) fail(data.error ?? "Photo didn't send. Try again.");
        else {
          // Keep showing the local preview until the realtime echo swaps in
          // the stored copy; the path lets that copy be signed.
          setSignedUrls((p) => ({ ...p, [path]: preview }));
          setMessages((p) => ({
            ...p,
            [convId]: (p[convId] ?? []).map((m) => (m.id === msg.id ? { ...m, imageUrl: path } : m)),
          }));
          setConversations((p) =>
            p
              .map((c) => (c.id === convId ? { ...c, lastMessage: "Photo", updatedAt: msg.createdAt, unread: 0 } : c))
              .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
          );
        }
      }
    } catch {
      fail("Couldn't reach the server. Check your connection and try again.");
    }
    setUploading(false);
  };

  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);
  const [counterDraft, setCounterDraft] = useState<Record<string, string>>({});
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<{ offerId: string; message: string } | null>(null);

  /**
   * Accept/decline/counter a pending offer, or accept/decline a counter.
   * The server (app/api/offers/route.ts PATCH) is the actual authority on
   * who can do what — RLS backs it up (supabase/10-offer-responses.sql).
   * On success it also drops a real "system" message into this same
   * thread, which the realtime subscription above picks up for the other
   * party; refreshing here (router.refresh-free — just re-fetch this
   * offer's status) keeps the acting side's own view in sync without
   * waiting on its own realtime echo (which is intentionally skipped for
   * the sender — see the INSERT handler above).
   */
  const respondToOffer = async (offerId: string, action: "accept" | "decline" | "counter") => {
    setOfferError(null);
    const counterAmount = action === "counter" ? Number(counterDraft[offerId]) : undefined;
    if (action === "counter" && (!counterAmount || counterAmount <= 0)) {
      setOfferError({ offerId, message: "Enter a counter amount above zero." });
      return;
    }
    setRespondingOfferId(offerId);
    try {
      const res = await fetch("/api/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, action, counterAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOfferError({ offerId, message: data.error ?? "Couldn't update that offer." });
        setRespondingOfferId(null);
        return;
      }
      // Reflect the new status on every message announcing this offer
      // (there's exactly one, but this doesn't assume that) without
      // waiting for a reload.
      setMessages((prev) => {
        const next: typeof prev = {};
        for (const [convId, msgs] of Object.entries(prev)) {
          next[convId] = msgs.map((m) =>
            m.offerId === offerId
              ? {
                  ...m,
                  offerStatus: data.status,
                  offerCounterAmount: action === "counter" ? counterAmount : m.offerCounterAmount,
                }
              : m
          );
        }
        return next;
      });
      // The server also drops a "system" message announcing this — the
      // realtime INSERT handler above deliberately skips echoing back the
      // acting user's own sends, so without this the person who just
      // clicked Accept/Decline/Counter wouldn't see that line appear until
      // a reload.
      if (activeId && ME) {
        const body =
          action === "counter"
            ? `Countered at $${counterAmount}`
            : action === "accept"
              ? "Offer accepted. The buyer can check out at this price from the cart."
              : "Offer declined.";
        setMessages((p) => ({
          ...p,
          [activeId]: [
            ...(p[activeId] ?? []),
            { id: `sys-${Date.now()}`, conversationId: activeId, senderId: ME, body, kind: "system", createdAt: new Date().toISOString() },
          ],
        }));
      }
      setCounteringOfferId(null);
    } catch {
      setOfferError({ offerId, message: "Couldn't reach the server. Try again." });
    }
    setRespondingOfferId(null);
  };

  // Server-rendered conversations/messages already belong to the right
  // user (they came from a cookie-authed query), but *which side* each
  // message renders on depends on ME, which only exists once useAuth()'s
  // getUser() call resolves client-side. Rendering through that gap used
  // to show every message — including the viewer's own — as if it were
  // the other person's. A brief loading state beats a wrong one.
  if (hasSupabase && authLoading) {
    return <div className="mx-auto max-w-[1560px] px-4 py-16 text-muted lg:px-6">Loading messages…</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="mx-auto max-w-[1560px] px-4 py-20 text-center lg:px-6">
        <h1 className="display text-3xl">No conversations yet</h1>
        <p className="mt-2 text-sm text-muted">
          Message a seller from any listing and the thread shows up here.
        </p>
        <Link
          href="/shop"
          className="btn btn-primary mt-5"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 lg:px-6">
      <h1 className="display mb-4 text-3xl">Messages</h1>

      {/* Fixed-height app shell on desktop: the conversation list and the
          thread each scroll inside themselves instead of growing the page. */}
      <div className="grid overflow-hidden rounded-card border border-line bg-card lg:h-[calc(100vh-var(--header-offset,140px)-120px)] lg:min-h-[520px] lg:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <aside
          className={`${showListOnMobile ? "block" : "hidden"} border-line lg:flex lg:min-h-0 lg:flex-col lg:border-r`}
        >
          <ul className="max-h-[70vh] overflow-y-auto sm:max-h-[560px] lg:max-h-none lg:flex-1">
            {conversations
              .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
              .map((c) => {
              const l = listings.find((x) => x.id === c.listingId);
              const isActive = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setActiveId(c.id);
                      setShowListOnMobile(false);
                      setConversations((p) =>
                        p.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x))
                      );
                    }}
                    className={`flex w-full gap-3 border-b border-line p-3 text-left transition ${
                      isActive ? "bg-trust-soft" : "hover:bg-paper"
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink">
                      {l && (
                        <ProductImage
                          src={l.image}
                          alt={l.title}
                          category={l.category}
                          seed={l.id}
                          className="h-full w-full"
                          showStockBadge={false}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {c.otherPartyName}
                        </span>
                        <span className="spec shrink-0 text-muted">
                          {timeAgo(c.updatedAt)}
                        </span>
                      </div>
                      <p className="spec truncate text-muted">{c.listingTitle}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {c.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="spec h-4 min-w-4 self-center rounded-full bg-deal px-1 text-center font-semibold text-white">
                        {c.unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Thread */}
        <section
          className={`${showListOnMobile ? "hidden" : "flex"} h-[calc(100dvh-var(--header-offset,120px)-40px)] min-h-[460px] flex-col lg:flex lg:h-auto lg:min-h-0`}
        >
          {active && (
            <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3">
              <button
                onClick={() => setShowListOnMobile(true)}
                className="spec rounded-lg border border-line px-2 py-1 lg:hidden"
              >
                Back
              </button>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink">
                {activeListing && (
                  <ProductImage
                    src={activeListing.image}
                    alt={activeListing.title}
                    category={activeListing.category}
                    seed={activeListing.id}
                    className="h-full w-full"
                    showStockBadge={false}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {active.otherPartyName}
                </p>
                <p className="truncate text-xs text-muted">
                  {active.listingTitle}
                  {activeListing && <span className="font-semibold text-ink"> · {money(activeListing.price)}</span>}
                </p>
              </div>
              <Link
                href={`/product/${active.listingId}/${activeListing?.slug ?? ""}`}
                className="btn btn-secondary btn-sm shrink-0"
              >
                View listing
              </Link>
            </header>
          )}

          <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper p-4 sm:p-5">
            {thread.length === 0 && (
              <p className="spec py-10 text-center text-muted">
                Say hello — ask about condition, age, or what&apos;s included.
              </p>
            )}
            {thread.map((m, i) => {
              const mine = m.senderId === ME;
              const sameGroup = (a?: Message, b?: Message) =>
                Boolean(a && b && a.senderId === b.senderId && (a.kind ?? "text") === "text" && (b.kind ?? "text") === "text" &&
                  Math.abs(+new Date(b.createdAt) - +new Date(a.createdAt)) < 5 * 60_000);
              const joinsPrev = sameGroup(thread[i - 1], m);
              const lastInGroup = !sameGroup(m, thread[i + 1]);
              if (m.kind === "system")
                return (
                  <p key={m.id} className="spec py-1 text-center text-muted">
                    {m.body} · {clockTime(m.createdAt)}
                  </p>
                );
              if (m.kind === "image") {
                const src = m.imageUrl?.startsWith("blob:") ? m.imageUrl : m.imageUrl && signedUrls[m.imageUrl];
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[70%]">
                      {src ? (
                        // Thumbnail in the thread; click opens the full photo.
                        <a href={src} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not an optimisable static asset */}
                          <img
                            src={src}
                            alt="Photo in conversation"
                            loading="lazy"
                            className="max-h-60 max-w-[240px] rounded-card border border-line object-cover shadow-sm"
                          />
                        </a>
                      ) : (
                        <div className="grid h-40 w-48 place-items-center rounded-card border border-line bg-card text-muted">
                          <span className="spec">Loading photo…</span>
                        </div>
                      )}
                      <span className={`spec mt-1 block text-muted ${mine ? "text-right" : ""}`}>
                        {clockTime(m.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              }
              if (m.kind === "offer") {
                // The offer message is always sent by the buyer, so "mine"
                // here means "I'm the buyer on this offer" — the seller is
                // whoever it's *not* mine for. Who gets which buttons
                // depends on both that and the offer's live status.
                const status = m.offerStatus ?? "pending";
                const iAmSeller = !mine;
                const canRespond =
                  (status === "pending" && iAmSeller) || (status === "countered" && mine);
                const busy = respondingOfferId === m.offerId;
                const showingCounter = counteringOfferId === m.offerId;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="w-full max-w-[280px] rounded-lg border border-deal bg-deal-soft px-4 py-3">
                      <p className="eyebrow text-deal">
                        {mine ? "You offered" : "Offer received"}
                      </p>
                      <p className="display mt-1 text-xl">
                        {money(m.offerAmount ?? 0)}
                      </p>

                      {status === "pending" && !canRespond && (
                        <p className="spec mt-2 text-muted">Waiting for a response…</p>
                      )}
                      {status === "countered" && (
                        <p className="spec mt-2 font-semibold text-deal">
                          {iAmSeller ? "You countered at " : "Countered at "}
                          {money(m.offerCounterAmount ?? 0)}
                          {!mine && " — waiting on the buyer"}
                        </p>
                      )}
                      {status === "accepted" && (
                        <p className="spec mt-2 font-semibold text-good">Accepted ✓</p>
                      )}
                      {status === "declined" && (
                        <p className="spec mt-2 font-semibold text-muted">Declined</p>
                      )}
                      {status === "redeemed" && (
                        <p className="spec mt-2 font-semibold text-good">Purchased ✓</p>
                      )}

                      {canRespond && !showingCounter && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() => m.offerId && respondToOffer(m.offerId, "accept")}
                            disabled={busy}
                            className="btn btn-primary btn-sm"
                          >
                            Accept
                          </button>
                          {status === "pending" && (
                            <button
                              onClick={() => m.offerId && setCounteringOfferId(m.offerId)}
                              disabled={busy}
                              className="btn btn-secondary btn-sm"
                            >
                              Counter
                            </button>
                          )}
                          <button
                            onClick={() => m.offerId && respondToOffer(m.offerId, "decline")}
                            disabled={busy}
                            className="btn btn-secondary btn-sm"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {canRespond && showingCounter && (
                        <div className="mt-2 space-y-1.5">
                          <input
                            value={counterDraft[m.offerId ?? ""] ?? ""}
                            onChange={(e) =>
                              setCounterDraft((p) => ({
                                ...p,
                                [m.offerId ?? ""]: e.target.value.replace(/[^0-9]/g, ""),
                              }))
                            }
                            placeholder="Your counter amount"
                            className="input text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => m.offerId && respondToOffer(m.offerId, "counter")}
                              disabled={busy}
                              className="btn btn-primary btn-sm"
                            >
                              Send counter
                            </button>
                            <button
                              onClick={() => setCounteringOfferId(null)}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {status === "accepted" && mine && (
                        <Link
                          href="/cart"
                          className="btn btn-primary btn-sm mt-2"
                        >
                          Go to checkout
                        </Link>
                      )}
                      {offerError && offerError.offerId === m.offerId && (
                        <p className="spec mt-2 text-deal">{offerError.message}</p>
                      )}
                      <p className="spec mt-2 text-muted">{clockTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"} ${joinsPrev ? "!mt-1" : ""}`}
                >
                  <div
                    className={`max-w-[75%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed sm:max-w-[65%] ${
                      mine
                        ? `rounded-[18px] bg-ink text-white ${lastInGroup ? "rounded-br-[6px]" : ""}`
                        : `rounded-[18px] border border-line bg-card text-ink ${lastInGroup ? "rounded-bl-[6px]" : ""}`
                    }`}
                  >
                    {m.body}
                    {lastInGroup && (
                      <span className="spec mt-1 block opacity-60">{clockTime(m.createdAt)}</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line p-3">
            {sendError && <p className="spec mb-2 text-deal">{sendError}</p>}
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={CHAT_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) sendPhoto(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !activeId}
                aria-label="Send a photo"
                title="Send a photo (JPEG, PNG, WebP or GIF, up to 5 MB)"
                className="grid w-11 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:border-ink/40 hover:text-ink disabled:opacity-40"
              >
                {uploading ? (
                  <span className="spec">…</span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="1.6" />
                    <path d="M21 16l-5-5-8 8" />
                  </svg>
                )}
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Write a message"
                aria-label="Write a message"
                className="max-h-28 flex-1 resize-none rounded-lg border border-line px-3 py-2.5 text-sm"
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="btn btn-primary"
              >
                Send
              </button>
            </div>
            <p className="spec mt-2 text-muted">
              Keep payment on {""}
              <Link href="/cart" className="text-trust hover:underline">
                the platform
              </Link>{" "}
              — off-site payments aren&apos;t covered if something goes wrong.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
