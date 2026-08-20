import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * RLS ("buyer reviews own released order" in supabase/04-reviews.sql) is
 * the actual gate — only the buyer on a released order for that seller
 * can insert one, and only once (order_id is unique). The checks here are
 * just for a clean error message instead of a raw Postgres one.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`reviews:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { orderId, rating, body } = await req.json();
  const ratingNum = Number(rating);
  if (!orderId || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5)
    return NextResponse.json({ error: "Pick a rating from 1 to 5." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, status")
    .eq("id", orderId)
    .single();
  if (orderError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.buyer_id !== user.id)
    return NextResponse.json({ error: "Only the buyer can review this order." }, { status: 403 });
  if (order.status !== "released")
    return NextResponse.json(
      { error: "You can review an order once it's complete." },
      { status: 400 }
    );

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: user.id,
    seller_id: order.seller_id,
    rating: ratingNum,
    body: body?.trim() ? String(body).slice(0, 2000) : null,
  });
  if (error)
    return NextResponse.json(
      { error: error.code === "23505" ? "You already reviewed this order." : error.message },
      { status: 500 }
    );

  return NextResponse.json({ ok: true });
}
