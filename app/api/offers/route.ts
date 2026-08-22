import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit(`offers:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { listingId, amount } = await req.json();
  if (!listingId || !amount || amount <= 0)
    return NextResponse.json({ error: "Offer amount is invalid." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in to make an offer." }, { status: 401 });

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("seller_id, price, status, accepts_offers")
    .eq("id", listingId)
    .single();
  if (listingError || !listing || listing.status !== "active")
    return NextResponse.json({ error: "This listing is no longer available." }, { status: 404 });
  if (listing.seller_id === user.id)
    return NextResponse.json({ error: "You cannot make an offer on your own listing." }, { status: 400 });
  if (!listing.accepts_offers)
    return NextResponse.json({ error: "This seller is not accepting offers." }, { status: 400 });
  if (amount > Number(listing.price))
    return NextResponse.json({ error: "Offer cannot exceed the asking price." }, { status: 400 });

  const { data: offer, error } = await supabase
    .from("offers")
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount,
      status: "pending",
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !offer) return NextResponse.json({ error: error?.message ?? "Couldn't send that offer." }, { status: 500 });

  // Get-or-create the thread and drop a real, persisted "offer" message
  // into it — same upsert-on-unique-constraint pattern as
  // app/api/messages/route.ts, so a second offer on the same listing
  // reuses the existing conversation instead of erroring. Without this,
  // the offer only ever existed as a row nobody's inbox could see; the
  // message thread previously reconstructed a decorative, unlinked
  // stand-in for it purely client-side (components/Messenger.tsx's
  // deepOffer handling), which had nothing to actually respond to.
  const { data: conv, error: convError } = await supabase
    .from("conversations")
    .upsert(
      { listing_id: listingId, buyer_id: user.id, seller_id: listing.seller_id },
      { onConflict: "listing_id,buyer_id" }
    )
    .select("id")
    .single();
  if (!convError && conv) {
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      listing_id: listingId,
      sender_id: user.id,
      body: `Offered $${amount}`,
      kind: "offer",
      offer_amount: amount,
      offer_id: offer.id,
    });
    await supabase
      .from("conversations")
      .update({ last_message: `Offered $${amount}`, updated_at: new Date().toISOString() })
      .eq("id", conv.id);
  }

  return NextResponse.json({ ok: true, persisted: true, offerId: offer.id, conversationId: conv?.id });
}

const ACTIONS = ["accept", "decline", "counter"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * A seller responds to a pending offer (accept/decline/counter), or a
 * buyer resolves a counter (accept/decline). RLS ("offer parties respond"
 * in supabase/10-offer-responses.sql) is the actual gate on who can move
 * an offer from which status — the checks here are just for a clean error
 * message instead of a raw "0 rows updated" or Postgres error.
 */
export async function PATCH(req: Request) {
  const limited = rateLimit(`offers-respond:${clientKey(req)}`, { limit: 20 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { offerId, action, counterAmount } = await req.json();
  if (!offerId || !ACTIONS.includes(action))
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, listing_id, buyer_id, seller_id, amount, counter_amount, status")
    .eq("id", offerId)
    .single();
  if (offerError || !offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });

  const isSeller = user.id === offer.seller_id;
  const isBuyer = user.id === offer.buyer_id;
  if (!isSeller && !isBuyer)
    return NextResponse.json({ error: "You're not a party to this offer." }, { status: 403 });

  let update: Record<string, unknown>;
  let messageBody: string;
  const action_: Action = action;

  if (action_ === "counter") {
    if (!isSeller || offer.status !== "pending")
      return NextResponse.json({ error: "This offer can't be countered right now." }, { status: 400 });
    const amount = Number(counterAmount);
    if (!Number.isFinite(amount) || amount <= 0)
      return NextResponse.json({ error: "Enter a counter amount above zero." }, { status: 400 });
    update = { status: "countered", counter_amount: amount, responded_at: new Date().toISOString() };
    messageBody = `Countered at $${amount}`;
  } else if (action_ === "accept") {
    const allowed = (isSeller && offer.status === "pending") || (isBuyer && offer.status === "countered");
    if (!allowed)
      return NextResponse.json({ error: "This offer can't be accepted right now." }, { status: 400 });
    update = { status: "accepted", responded_at: new Date().toISOString() };
    // A countered offer's binding price is the counter, not the buyer's
    // original ask — app/api/checkout/route.ts reads the same fallback
    // (counter_amount ?? amount) when honoring an accepted offer's price.
    const finalAmount = offer.status === "countered" ? offer.counter_amount : offer.amount;
    messageBody = `Offer accepted — $${finalAmount}. The buyer can check out at this price from the cart.`;
  } else {
    const allowed = (isSeller && offer.status === "pending") || (isBuyer && offer.status === "countered");
    if (!allowed)
      return NextResponse.json({ error: "This offer can't be declined right now." }, { status: 400 });
    update = { status: "declined", responded_at: new Date().toISOString() };
    messageBody = "Offer declined.";
  }

  const { error } = await supabase.from("offers").update(update).eq("id", offerId);
  if (error)
    return NextResponse.json(
      { error: error.message || "Couldn't update that offer — it may have already been responded to." },
      { status: 409 }
    );

  // Same get-or-create as POST above — the conversation should already
  // exist (the offer couldn't have been sent without one), but this stays
  // resilient if it somehow doesn't.
  const { data: conv } = await supabase
    .from("conversations")
    .upsert(
      { listing_id: offer.listing_id, buyer_id: offer.buyer_id, seller_id: offer.seller_id },
      { onConflict: "listing_id,buyer_id" }
    )
    .select("id")
    .single();
  if (conv) {
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      listing_id: offer.listing_id,
      sender_id: user.id,
      body: messageBody,
      kind: "system",
    });
    await supabase
      .from("conversations")
      .update({ last_message: messageBody, updated_at: new Date().toISOString() })
      .eq("id", conv.id);
  }

  return NextResponse.json({ ok: true, status: update.status });
}
