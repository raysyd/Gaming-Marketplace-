import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { BRAND } from "@/lib/brand";

/**
 * Separate charges and transfers, not a destination charge — a plain
 * PaymentIntent captured immediately on the platform's own account, with
 * no `transfer_data` at all. This is deliberate: Stripe explicitly
 * recommends against destination charges for hold-and-release escrow —
 * a destination charge transfers to the connected account the moment
 * payment succeeds, which is exactly wrong for "buyer pays now, seller
 * gets paid once delivery is confirmed". It also would have meant relying
 * on `capture_method: "manual"`'s ~7-day authorization window as the
 * escrow hold, which silently breaks for any order that takes longer
 * than that to deliver. Here, the charge is real and immediate — the
 * money sits in the platform's own Stripe balance — and the actual
 * transfer to the seller only happens later, in
 * /api/orders/[id]/release, as its own explicit stripe.transfers.create()
 * call. The escrow hold is a business-logic hold (orders.status), not a
 * Stripe-level one.
 *
 * A cart can only belong to one seller (there's one order row's worth of
 * fee accounting per checkout) — the cart page enforces that before this
 * is ever called, but it's re-checked here since this is the boundary
 * that actually moves money.
 *
 * The client only ever sends listing IDs + quantities — price and title
 * are always re-read from the database here, never trusted from the
 * request body. The cart's own price/title fields exist purely for
 * display before checkout.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`checkout:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });

  const ids = [...new Set(items.map((i: { id?: string }) => i.id).filter(Boolean))] as string[];
  if (!ids.length)
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ url: null, message: "Sign-in is not configured." });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in to check out." }, { status: 401 });

  // Trusted source of truth for price, title and seller — the request
  // body is never used for anything that affects the amount charged.
  // `active` status is enforced by RLS on this table regardless.
  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("id, title, price, seller_id, status")
    .in("id", ids);
  if (listingsError || !listings?.length)
    return NextResponse.json({ error: "Couldn't load those listings." }, { status: 400 });
  if (listings.length !== ids.length || listings.some((l) => l.status !== "active"))
    return NextResponse.json(
      { error: "One or more items in your cart are no longer available." },
      { status: 409 }
    );

  const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
  if (sellerIds.length !== 1)
    return NextResponse.json(
      { error: "A checkout can only contain items from one seller." },
      { status: 400 }
    );
  const sellerId = sellerIds[0] as string;
  if (user.id === sellerId)
    return NextResponse.json({ error: "You can't buy your own listing." }, { status: 400 });

  const stripe = await getStripe();
  if (!stripe)
    return NextResponse.json({
      url: null,
      message:
        "Checkout isn't connected yet. Add STRIPE_SECRET_KEY in your environment to switch it on.",
    });

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", sellerId)
    .maybeSingle();

  const accountId = sellerProfile?.stripe_account_id as string | undefined;
  if (!accountId)
    return NextResponse.json(
      { error: "This seller hasn't set up payouts yet — message them or check back later." },
      { status: 409 }
    );

  // A connected account can exist (has an ID) without onboarding actually
  // being finished — verify it can actually receive a transfer before
  // taking the buyer's money, rather than collecting a payment that can
  // never be released. Accounts v2's equivalent of v1's
  // charges_enabled/payouts_enabled is this capability's own status.
  try {
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient"],
    });
    const transferStatus =
      account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
    if (transferStatus !== "active") {
      return NextResponse.json(
        { error: "This seller's payout account isn't finished setting up yet." },
        { status: 409 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't verify the seller's payout account. Try again shortly." },
      { status: 500 }
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const currency = BRAND.currency.toLowerCase();
  const listingIds = listings.map((l) => l.id).join(",");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: listings.map((l) => ({
        // Every listing here has stock 1 — one line item each, quantity 1.
        // Client-submitted quantity is ignored for the same reason price is.
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(l.price * 100),
          product_data: { name: l.title },
        },
      })),
      // No transfer_data, no capture_method: "manual", no
      // application_fee_amount — this is a plain charge to the platform's
      // own balance, captured immediately. The platform fee is computed
      // and stored on the order row by the webhook below, then actually
      // applied as the transfer amount in /api/orders/[id]/release.
      payment_intent_data: {
        metadata: { buyerId: user.id, sellerId, listingIds },
      },
      metadata: { buyerId: user.id, sellerId, listingIds },
      success_url: `${site}/dashboard?paid=1`,
      cancel_url: `${site}/cart`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ url: null, message }, { status: 500 });
  }
}
