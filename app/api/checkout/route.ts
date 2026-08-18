import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { BRAND } from "@/lib/brand";

/**
 * Stripe Connect destination charge with a manual capture window. The
 * buyer's card is authorised now, not charged. /api/webhooks/stripe
 * creates the order once Stripe confirms the hold, and /api/orders/[id]/
 * release captures + auto-transfers to the seller's connected account
 * once the buyer confirms delivery.
 *
 * A single PaymentIntent can only carry one `transfer_data.destination`,
 * so this only accepts a cart that belongs to one seller — the cart page
 * enforces that before this is ever called, but it's re-checked here
 * since this is the boundary that actually moves money.
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
  // being finished — verify it can receive a transfer before taking the
  // buyer's money, rather than authorising a charge that can never be
  // released.
  try {
    const account = await stripe.accounts.retrieve(accountId);
    if (!account.charges_enabled && !account.payouts_enabled) {
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

  const feeBps = Number(process.env.PLATFORM_FEE_BPS ?? 800);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const currency = BRAND.currency.toLowerCase();

  // Every listing here has stock 1 — one line item each, quantity 1.
  // Client-submitted quantity is ignored for the same reason price is.
  const totalCents = listings.reduce((n, l) => n + Math.round(l.price * 100), 0);
  const applicationFeeAmount = Math.round((totalCents * feeBps) / 10000);
  const listingIds = listings.map((l) => l.id).join(",");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: listings.map((l) => ({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(l.price * 100),
          product_data: { name: l.title },
        },
      })),
      payment_intent_data: {
        // Funds are authorised now and captured on delivery confirmation.
        capture_method: "manual",
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: accountId },
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
