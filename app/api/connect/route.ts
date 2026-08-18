import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Creates (or reuses) a Stripe Connect Express account for the signed-in
 * seller and returns a fresh onboarding link. Only requests the `transfers`
 * capability — the seller never takes card payments directly, the platform
 * does that and transfers their cut via the destination charge in
 * /api/checkout, so `card_payments` isn't needed on the connected account.
 */
async function startOnboarding() {
  const supabase = await createClient();
  if (!supabase)
    return { error: "Sign-in is not configured.", status: 500 } as const;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first.", status: 401 } as const;

  const stripe = await getStripe();
  if (!stripe)
    return {
      error:
        "Payouts aren't connected yet. Add STRIPE_SECRET_KEY in your environment to switch it on.",
      status: 500,
    } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();

  let accountId = profile?.stripe_account_id as string | null | undefined;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "AU",
      email: user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
    });
    accountId = account.id;

    // Self-service upsert — RLS ("own profile insert" / "own profile
    // writable") already scopes this to auth.uid() = id, no elevated
    // client needed.
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, stripe_account_id: accountId });
    if (upsertError) return { error: upsertError.message, status: 500 } as const;
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    // Stripe requires a GET-able refresh_url — the GET handler below
    // just re-runs this and redirects, so an expired/abandoned link
    // self-heals into a fresh one.
    refresh_url: `${site()}/api/connect`,
    return_url: `${site()}/dashboard?connected=1`,
    type: "account_onboarding",
  });

  return { url: link.url } as const;
}

export async function POST(req: Request) {
  const limited = rateLimit(`connect:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const result = await startOnboarding();
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  const limited = rateLimit(`connect:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok) return NextResponse.redirect(`${site()}/dashboard?connect_error=1`);

  const result = await startOnboarding();
  if ("error" in result)
    return NextResponse.redirect(`${site()}/dashboard?connect_error=1`);
  return NextResponse.redirect(result.url);
}
