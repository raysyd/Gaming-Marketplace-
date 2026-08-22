import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { siteUrlFrom } from "@/lib/site-url";
import { BRAND } from "@/lib/brand";

/** Checkout Session hold — how long a reservation survives an abandoned checkout. */
const RESERVATION_MINUTES = 30;

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

  // Quantity is read from the cart here, but never trusted for price —
  // only for how many units to reserve and charge for. Duplicate ids in
  // the payload (shouldn't happen from the cart UI, but this is the
  // trust boundary) are summed rather than overwritten, so nothing can
  // under-count a listing's actual requested quantity.
  const qtyById = new Map<string, number>();
  for (const i of items as { id?: string; qty?: number }[]) {
    if (!i?.id) continue;
    const qty = Math.floor(Number(i.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    qtyById.set(i.id, (qtyById.get(i.id) ?? 0) + qty);
  }
  const ids = [...qtyById.keys()];
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
    .select("id, title, price, seller_id, status, ships_free, stock")
    .in("id", ids);
  if (listingsError || !listings?.length)
    return NextResponse.json({ error: "Couldn't load those listings." }, { status: 400 });
  if (listings.length !== ids.length || listings.some((l) => l.status !== "active"))
    return NextResponse.json(
      { error: "One or more items in your cart are no longer available." },
      { status: 409 }
    );
  // Cheap early check against a stale cart — reserve_listing_stock_qty's
  // own atomic `stock >= req.qty` is still what actually decides this
  // under a race; this just gives a clearer message for the common case
  // of a cart that's simply gone stale.
  const overStock = listings.find((l) => (qtyById.get(l.id) ?? 0) > l.stock);
  if (overStock)
    return NextResponse.json(
      { error: `Only ${overStock.stock} left of "${overStock.title}" — lower the quantity in your cart.` },
      { status: 409 }
    );

  // An accepted offer (from components/Messenger.tsx's accept flow) binds
  // the price for that one listing — only ever for a qty-1 purchase, since
  // an offer is on one unit of one listing, not a bulk rate. Never trusted
  // from the client: read straight from `offers`, scoped to this buyer, and
  // only 'accepted' (not 'redeemed' — already used once) counts.
  const offerPriceByListing = new Map<string, number>();
  const singleQtyIds = ids.filter((id) => (qtyById.get(id) ?? 0) === 1);
  if (singleQtyIds.length) {
    const { data: acceptedOffers } = await supabase
      .from("offers")
      .select("listing_id, amount, counter_amount")
      .eq("buyer_id", user.id)
      .eq("status", "accepted")
      .in("listing_id", singleQtyIds);
    for (const o of acceptedOffers ?? []) {
      offerPriceByListing.set(o.listing_id, Number(o.counter_amount ?? o.amount));
    }
  }

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

  // Reserve the requested quantity of stock per listing, atomically,
  // before Stripe ever sees this checkout — via a SECURITY DEFINER
  // function (supabase/09-cart-quantity.sql), not a plain .update(). There
  // is no RLS policy letting a buyer touch a listing they don't own (only
  // "sellers manage own listings" exists), so a direct update from this
  // buyer-authed client would silently match zero rows every time. The
  // function's own atomic `stock = stock - qty ... where status = 'active'
  // and stock >= qty` is what makes concurrent checkouts on the last units
  // safe: Postgres's row lock means whichever request's update commits
  // first wins, and the second gets 0 rows back instead of a false "it
  // worked". This is the first line of defense; the `stock >= 0` check
  // constraint is what holds even if this logic ever has a bug.
  const qtys = ids.map((id) => qtyById.get(id) ?? 0);
  const { data: reserved, error: reserveError } = await supabase.rpc(
    "reserve_listing_stock_qty",
    { ids, qtys }
  );
  if (reserveError)
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 500 });
  if (!reserved || reserved.length !== ids.length) {
    // Partial reservation — someone else got the rest a moment before us
    // (or a listing had already sold out). Put back only what we actually
    // took, not the whole cart.
    if (reserved?.length) {
      const reservedIds = reserved.map((r: { id: string }) => r.id);
      await supabase.rpc("release_listing_stock_qty", {
        ids: reservedIds,
        qtys: reservedIds.map((id: string) => qtyById.get(id) ?? 0),
      });
    }
    return NextResponse.json(
      { error: "Someone just bought one or more of these items. Refresh your cart and try again." },
      { status: 409 }
    );
  }

  const site = siteUrlFrom(req);
  const currency = BRAND.currency.toLowerCase();
  const listingIds = listings.map((l) => l.id).join(",");
  const listingQtys = listings.map((l) => qtyById.get(l.id) ?? 1).join(",");

  // Shipping ships as one parcel per seller, so it's charged once per
  // checkout, never per item — a mixed cart of free- and paid-shipping
  // items from the same seller still only pays the flat rate once. Read
  // fresh from lib/brand.ts rather than trusting anything the client sent;
  // this is the one number that ends up charged, shown, and stored (see
  // the webhook, which is the only place that writes it to `orders`).
  const shippingFee = listings.some((l) => !l.ships_free) ? BRAND.shippingFlatRate : 0;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        ...listings.map((l) => ({
          // The quantity actually reserved above — client-submitted qty was
          // only ever a hint for how much to reserve, never trusted for
          // price, but this is the one field it's allowed to drive, since
          // reserve_listing_stock_qty already re-validated it against real
          // stock.
          quantity: qtyById.get(l.id) ?? 1,
          price_data: {
            currency,
            unit_amount: Math.round((offerPriceByListing.get(l.id) ?? l.price) * 100),
            product_data: { name: l.title },
          },
        })),
        ...(shippingFee > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency,
                  unit_amount: Math.round(shippingFee * 100),
                  product_data: { name: "Shipping" },
                },
              },
            ]
          : []),
      ],
      // No transfer_data, no capture_method: "manual", no
      // application_fee_amount — this is a plain charge to the platform's
      // own balance, captured immediately. The platform fee is computed
      // and stored on the order row by the webhook below, then actually
      // applied as the transfer amount in /api/orders/[id]/release.
      payment_intent_data: {
        metadata: { buyerId: user.id, sellerId, listingIds, listingQtys, shippingFee: String(shippingFee) },
      },
      metadata: { buyerId: user.id, sellerId, listingIds, listingQtys, shippingFee: String(shippingFee) },
      // Bounds how long a reservation can hold stock hostage if the buyer
      // just closes the tab — checkout.session.expired (see the webhook)
      // restocks these listings when this passes.
      expires_at: Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60,
      success_url: `${site}/buying/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    // The reservation already happened — a Stripe-side failure here must
    // not leave stock stuck decremented with no checkout ever created.
    await supabase.rpc("release_listing_stock_qty", { ids, qtys });
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ url: null, message }, { status: 500 });
  }
}
