import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret)
    return NextResponse.json({ received: true, verified: false });

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(key);
  const signature = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature check failed." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      // Order is created and held. Money is authorised, not yet captured.
      break;
    case "payment_intent.amount_capturable_updated":
      // Ready to capture once the buyer confirms delivery.
      break;
    case "charge.refunded":
      // Buyer reported a problem inside the 3-day window.
      break;
  }

  return NextResponse.json({ received: true });
}
