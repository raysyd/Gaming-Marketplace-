import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getPremiumPlan } from "@/lib/premium";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { siteUrlFrom } from "@/lib/site-url";

/**
 * A plain Stripe subscription Checkout Session — entirely separate from
 * Connect (see app/api/checkout/route.ts and app/api/connect/route.ts),
 * which is about paying sellers. This is the platform charging the buyer
 * directly for their own account, same as any SaaS subscription: no
 * connected account, no transfer, no escrow hold. Stripe's subscription
 * lifecycle is tracked via customer.subscription.* webhook events (see
 * app/api/webhooks/stripe/route.ts), not by anything this route writes
 * directly — a checkout session completing doesn't guarantee the first
 * invoice actually succeeds.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`premium:${clientKey(req)}`, { limit: 5 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ url: null, message: "Sign-in is not configured." });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });

  const stripe = await getStripe();
  if (!stripe)
    return NextResponse.json({
      url: null,
      message: "Payments aren't connected yet. Add STRIPE_SECRET_KEY in your environment to switch this on.",
    });

  const plan = await getPremiumPlan();
  if (!plan.stripePriceId)
    return NextResponse.json(
      { error: "Premium Seller isn't configured yet — set stripe_price_id in the premium_plan table." },
      { status: 503 }
    );

  const { data: profile } = await supabase
    .from("profiles")
    .select("premium_status, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.premium_status === "active")
    return NextResponse.json({ error: "You're already a Premium Seller." }, { status: 400 });

  const site = siteUrlFrom(req);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id ? undefined : (user.email ?? undefined),
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      success_url: `${site}/account?premium=1`,
      cancel_url: `${site}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't start checkout.";
    return NextResponse.json({ url: null, message }, { status: 500 });
  }
}
