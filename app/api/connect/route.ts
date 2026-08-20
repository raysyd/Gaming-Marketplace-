import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { siteUrlFrom } from "@/lib/site-url";

/**
 * Creates (or reuses) a Stripe Connect account for the signed-in seller and
 * returns a fresh onboarding link — via Accounts v2, not the legacy v1
 * `type: "express"` API. v2 replaces the old fixed account "types" with
 * three independent dimensions instead (see Stripe's connect-recommend
 * skill, account-types.md): `dashboard: "express"` (lightweight
 * earnings/payout view, not full Stripe control) plus
 * `defaults.responsibilities.fees_collector/losses_collector: "application"`
 * — the platform, not Stripe, owns fees and dispute/negative-balance risk.
 * That combination is required for an Express-style dashboard, and is also
 * what "separate charges and transfers" (see /api/checkout) needs — a
 * destination charge is NOT valid for a hold-and-release marketplace like
 * this one, only for immediate payout on purchase.
 *
 * `configuration.recipient` (not `merchant`) — the seller never takes card
 * payments directly, the platform does that and transfers their cut via
 * /api/orders/[id]/release, so only the `stripe_transfers` capability is
 * needed on the connected account, not `card_payments`.
 */
async function startOnboarding(req: Request) {
  const site = siteUrlFrom(req);
  const supabase = await createClient();
  if (!supabase)
    return { error: "Sign-in is not configured.", status: 500 } as const;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first.", status: 401 } as const;

  // Required before a seller can connect a payout account — see
  // app/account/security. Checked here (not just hidden in the UI) since
  // this is the boundary that actually starts moving real money to them.
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const hasVerifiedMfa = (factorsData?.totp ?? []).some((f) => f.status === "verified");
  if (!hasVerifiedMfa)
    return {
      error: "Turn on two-factor authentication before connecting a payout account.",
      status: 403,
    } as const;

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

  // Every Stripe call here was previously unguarded — any rejection (bad
  // key, Connect not enabled on the platform account, an unsupported
  // capability/country combo, a Stripe-side blip) threw an unhandled
  // exception out of this function. Next.js then returns a non-JSON error
  // page for that, which the client's res.json() fails to parse — so the
  // real Stripe error was never visible, just a generic "couldn't reach
  // the server" from the client's own catch block. Surfacing it properly
  // now instead of guessing at it blind.
  try {
    if (!accountId) {
      const account = await stripe.v2.core.accounts.create({
        contact_email: user.email ?? undefined,
        dashboard: "express",
        identity: { country: "au", entity_type: "individual" },
        configuration: {
          recipient: {
            capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
          },
        },
        defaults: {
          currency: "aud",
          responsibilities: { fees_collector: "application", losses_collector: "application" },
        },
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

    // Account Links are also namespaced under v2 for a v2-created account —
    // the v1 stripe.accountLinks.create() rejects a v2 account id.
    const link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          // Stripe requires a GET-able refresh_url — the GET handler below
          // just re-runs this and redirects, so an expired/abandoned link
          // self-heals into a fresh one.
          refresh_url: `${site}/api/connect`,
          return_url: `${site}/selling?connected=1`,
        },
      },
    });

    return { url: link.url } as const;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe rejected the request.";
    return { error: message, status: 500 } as const;
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(`connect:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const result = await startOnboarding(req);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  const limited = rateLimit(`connect:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.redirect(`${siteUrlFrom(req)}/dashboard?connect_error=1`);

  const result = await startOnboarding(req);
  if ("error" in result)
    return NextResponse.redirect(`${siteUrlFrom(req)}/dashboard?connect_error=1`);
  return NextResponse.redirect(result.url);
}
