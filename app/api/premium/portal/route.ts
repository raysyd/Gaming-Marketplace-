import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { siteUrlFrom } from "@/lib/site-url";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Stripe's own Billing Portal — update payment method, view invoices,
 * cancel. Simplest correct way to let a subscriber manage or cancel
 * without building a bespoke cancellation flow (and its own webhook race
 * conditions) for a first implementation.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`premium-portal:${clientKey(req)}`, { limit: 5 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ url: null });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.stripe_customer_id)
    return NextResponse.json({ error: "No subscription to manage yet." }, { status: 400 });

  const stripe = await getStripe();
  if (!stripe) return NextResponse.json({ url: null });

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${siteUrlFrom(req)}/account`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't open billing portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
