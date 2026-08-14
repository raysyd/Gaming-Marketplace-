"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Conversation, Listing, Message } from "@/lib/types";
import { clockTime, money, timeAgo } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

const ME = "u-you";

export function Messenger({
  initialConversations,
  initialMessages,
  listings,
}: {
  initialConversations: Conversation[];
  initialMessages: Record<string, Message[]>;
  listings: Listing[];
}) {
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

  /* Arriving from a listing: open that thread, creating it if it's new. */
  useEffect(() => {
    if (!deepListing) return;
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
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    setActiveId(target);
    setShowListOnMobile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepListing, deepOffer]);

  /* Live updates when Supabase is wired up. */
  useEffect(() => {
    if (!hasSupabase || !activeId) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          const incoming: Message = {
            id: String(r.id),
            conversationId: String(r.conversation_id),
            senderId: String(r.sender_id),
            body: String(r.body ?? ""),
            kind: (r.kind as Message["kind"]) ?? "text",
            offerAmount: r.offer_amount ? Number(r.offer_amount) : undefined,
            createdAt: String(r.created_at),
          };
          if (incoming.senderId === ME) return;
          setMessages((p) => ({
            ...p,
            [activeId]: [...(p[activeId] ?? []), incoming],
          }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  const thread = activeId ? messages[activeId] ?? [] : [];
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );
  const activeListing = listings.find((l) => l.id === active?.listingId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, activeId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId) return;
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
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          body,
          listingId: active?.listingId,
        }),
      });
    } catch {
      // Message stays in the thread; the send is retried on the next action.
    }
    setSending(false);
  };

  if (conversations.length === 0) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-20 text-center">
        <h1 className="display text-[26px]">No conversations yet</h1>
        <p className="mt-2 text-[14px] text-muted">
          Message a seller from any listing and the thread shows up here.
        </p>
        <Link
          href="/shop"
          className="mt-5 inline-block rounded-md bg-ink px-6 py-3 text-[14px] font-semibold text-white"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6">
      <h1 className="display mb-4 text-[26px]">Messages</h1>

      <div className="grid overflow-hidden rounded-[10px] border border-line bg-card lg:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <aside
          className={`${showListOnMobile ? "block" : "hidden"} border-line lg:block lg:border-r`}
        >
          <ul className="max-h-[70vh] overflow-y-auto sm:max-h-[560px]">
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
          className={`${showListOnMobile ? "hidden" : "flex"} min-h-[70vh] flex-col sm:min-h-[560px] lg:flex`}
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

          <div className="flex-1 space-y-3 overflow-y-auto bg-paper p-4">
            {thread.length === 0 && (
              <p className="spec py-10 text-center text-muted">
                Say hello — ask about condition, age, or what&apos;s included.
              </p>
            )}
            {thread.map((m) => {
              const mine = m.senderId === ME;
              if (m.kind === "offer")
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="rounded-lg border border-deal bg-deal-soft px-4 py-3">
                      <p className="eyebrow text-deal">
                        {mine ? "You offered" : "Offer received"}
                      </p>
                      <p className="display mt-1 text-[22px]">
                        {money(m.offerAmount ?? 0)}
                      </p>
                      {!mine && (
                        <div className="mt-2 flex gap-2">
                          <button className="rounded bg-ink px-3 py-1.5 text-[12px] font-semibold text-white">
                            Accept
                          </button>
                          <button className="rounded border border-ink/25 px-3 py-1.5 text-[12px] font-semibold">
                            Counter
                          </button>
                        </div>
                      )}
                      <p className="spec mt-2 text-muted">{clockTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      mine
                        ? "bg-ink text-white"
                        : "border border-line bg-card text-ink"
                    }`}
                  >
                    {m.body}
                    <span
                      className={`spec mt-1 block ${mine ? "text-white/50" : "text-muted"}`}
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
                className="rounded-md bg-deal px-5 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
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
