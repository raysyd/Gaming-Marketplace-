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

  const { error } = await supabase.from("offers").insert({
    listing_id: listingId,
    buyer_id: user.id,
    amount,
    status: "pending",
    expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, persisted: true });
}
