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
