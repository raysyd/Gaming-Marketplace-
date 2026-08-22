import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { siteUrlFrom } from "@/lib/site-url";

/**
 * Starts a Stripe Identity check for the signed-in user — the actual
 * automated path that can ever set profiles.verified = true (see
 * supabase/07-profiles.sql: that column has no writer yet). This never
 * sets the flag itself; the webhook does, only once Stripe's own
 * `identity.verification_session.verified` event confirms a passed check.
 * "Verified" is deliberately kept out of reach of anything a browser
 * session could forge — see the column-grant lockdown in
 * 08-premium-seller.sql.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`identity:${clientKey(req)}`, { limit: 5 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ error: "Sign-in is not configured." }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.verified)
    return NextResponse.json({ error: "This account is already verified." }, { status: 400 });

  const stripe = await getStripe();
  if (!stripe)
    return NextResponse.json(
      { error: "Identity checks aren't connected yet. Add STRIPE_SECRET_KEY in your environment to switch it on." },
      { status: 500 }
    );

  const site = siteUrlFrom(req);
  try {
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { userId: user.id },
      return_url: `${site}/account?identity=return`,
    });
    if (!session.url)
      return NextResponse.json({ error: "Couldn't start the identity check." }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe rejected the request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
