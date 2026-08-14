import { NextResponse } from "next/server";

/**
 * Stripe Connect destination charge with a manual capture window.
 * The buyer's money sits with the platform until delivery is confirmed,
 * then /api/webhooks/stripe (or a manual release) transfers it to the seller.
 */
export async function POST(req: Request) {
  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    return NextResponse.json({
      url: null,
      message:
        "Checkout isn't connected yet. Add STRIPE_SECRET_KEY in your environment to switch it on.",
    });

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(key);
  const feeBps = Number(process.env.PLATFORM_FEE_BPS ?? 800);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const total = items.reduce(
    (n: number, i: { price: number; qty: number }) => n + i.price * i.qty,
    0
  );

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((i: { title: string; price: number; qty: number }) => ({
        quantity: i.qty,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(i.price * 100),
          product_data: { name: i.title },
        },
      })),
      payment_intent_data: {
        // Funds are authorised now and captured on delivery confirmation.
        capture_method: "manual",
        application_fee_amount: Math.round((total * 100 * feeBps) / 10000),
        // transfer_data: { destination: sellerStripeAccountId },
        metadata: { listingIds: items.map((i: { id: string }) => i.id).join(",") },
      },
      success_url: `${site}/dashboard?paid=1`,
      cancel_url: `${site}/cart`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ url: null, message }, { status: 500 });
  }
}
