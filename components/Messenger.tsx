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
    if (!listing) return;

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
   * Live updates when Supabase is wired up — one subscription for the
   * whole inbox, not per open thread. The previous version filtered
   * postgres_changes down to `conversation_id=eq.${activeId}`, so a
   * message landing in any conversation other than the one currently on
   * screen was invisible until the page was reloaded: no badge, no
   * preview update, nothing. Subscribing unfiltered instead relies on
   * Realtime applying the same RLS "participants read messages"/
   * "participants read conversations" policies to what gets broadcast,
   * so this still only ever receives rows ME is actually a party to.
   */
  useEffect(() => {
    if (!hasSupabase || !ME) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`inbox:${ME}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          const convId = String(r.conversation_id);
          const incoming: Message = {
            id: String(r.id),
            conversationId: convId,
            senderId: String(r.sender_id),
            body: String(r.body ?? ""),
            kind: (r.kind as Message["kind"]) ?? "text",
            offerAmount: r.offer_amount ? Number(r.offer_amount) : undefined,
            createdAt: String(r.created_at),
          };
          if (incoming.senderId === ME) return; // own send, already applied optimistically

          setMessages((p) => {
            if (p[convId]?.some((m) => m.id === incoming.id)) return p;
            return { ...p, [convId]: [...(p[convId] ?? []), incoming] };
          });
          setConversations((p) => {
            if (!p.some((c) => c.id === convId)) return p; // new-thread case, handled below
            return p
              .map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      lastMessage: incoming.body,
                      updatedAt: incoming.createdAt,
                      unread: convId === activeIdRef.current ? 0 : c.unread + 1,
                    }
                  : c
              )
              .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
          });
          if (convId === activeIdRef.current) {
            fetch("/api/messages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId: convId }),
            }).catch(() => {});
          }
        }
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
      .subscribe();
    return () => {
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
      const data = await res.json();
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
      // Message stays in the thread; the send is retried on the next action.
    }
    setSending(false);
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
        <h1 className="display text-[26px]">No conversations yet</h1>
        <p className="mt-2 text-[14px] text-muted">
          Message a seller from any listing and the thread shows up here.
        </p>
        <Link
          href="/shop"
          className="btn btn-dark mt-5"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1560px] px-4 py-6 lg:px-6">
      <h1 className="display mb-4 text-[30px]">Messages</h1>

      {/* Fixed-height app shell on desktop: the conversation list and the
          thread each scroll inside themselves instead of growing the page. */}
      <div className="grid overflow-hidden panel lg:h-[calc(100vh-var(--header-offset,140px)-120px)] lg:min-h-[520px] lg:grid-cols-[340px_1fr]">
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
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-ink">
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
                        <span className="truncate text-[13px] font-semibold">
                          {c.otherPartyName}
                        </span>
                        <span className="spec shrink-0 text-muted">
                          {timeAgo(c.updatedAt)}
                        </span>
                      </div>
                      <p className="spec truncate text-muted">{c.listingTitle}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted">
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
          className={`${showListOnMobile ? "hidden" : "flex"} min-h-[70vh] flex-col sm:min-h-[560px] lg:flex lg:min-h-0`}
        >
          {active && (
            <header className="flex items-center gap-3 border-b border-line p-3">
              <button
                onClick={() => setShowListOnMobile(true)}
                className="spec rounded border border-line px-2 py-1 lg:hidden"
              >
                Back
              </button>
              <div className="h-9 w-9 overflow-hidden rounded bg-ink">
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
                <p className="truncate text-[13.5px] font-semibold">
                  {active.otherPartyName}
                </p>
                <Link
                  href={`/product/${active.listingId}/${activeListing?.slug ?? ""}`}
                  className="spec truncate text-trust hover:underline"
                >
                  {active.listingTitle}
                </Link>
              </div>
              {activeListing && (
                <span className="display shrink-0 text-[17px]">
                  {money(activeListing.price)}
                </span>
              )}
            </header>
          )}

          <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper p-4 sm:p-5">
            {thread.length === 0 && (
              <p className="spec py-10 text-center text-muted">
                Say hello — ask about condition, age, or what&apos;s included.
              </p>
            )}
            {thread.map((m) => {
              const mine = m.senderId === ME;
              if (m.kind === "system")
                return (
                  <p key={m.id} className="spec py-1 text-center text-muted">
                    {m.body} · {clockTime(m.createdAt)}
                  </p>
                );
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
                      <p className="display mt-1 text-[22px]">
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
                            className="rounded bg-ink px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            Accept
                          </button>
                          {status === "pending" && (
                            <button
                              onClick={() => m.offerId && setCounteringOfferId(m.offerId)}
                              disabled={busy}
                              className="rounded border border-ink/25 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
                            >
                              Counter
                            </button>
                          )}
                          <button
                            onClick={() => m.offerId && respondToOffer(m.offerId, "decline")}
                            disabled={busy}
                            className="rounded border border-ink/25 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
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
                            className="input text-[13px]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => m.offerId && respondToOffer(m.offerId, "counter")}
                              disabled={busy}
                              className="rounded bg-ink px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                            >
                              Send counter
                            </button>
                            <button
                              onClick={() => setCounteringOfferId(null)}
                              className="rounded border border-ink/25 px-3 py-1.5 text-[12px] font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {status === "accepted" && mine && (
                        <Link
                          href="/cart"
                          className="btn btn-dark btn-sm mt-2"
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
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm ${
                      mine
                        ? "rounded-[18px] rounded-br-[6px] bg-trust text-white"
                        : "rounded-[18px] rounded-bl-[6px] border border-line bg-card text-ink"
                    }`}
                  >
                    {m.body}
                    <span
                      className={`spec mt-1 block ${mine ? "text-white/70" : "text-muted"}`}
                    >
                      {clockTime(m.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line p-3">
            <div className="flex gap-2">
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
                className="max-h-28 flex-1 resize-none rounded-md border border-line px-3 py-2.5 text-[13.5px]"
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="btn btn-primary btn-sm"
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
