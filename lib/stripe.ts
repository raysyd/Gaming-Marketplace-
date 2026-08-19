/**
 * Lazily imported so `stripe` never gets pulled into a bundle that doesn't
 * need it, and returns null instead of throwing when the site isn't
 * configured yet — same "demo mode" pattern as lib/supabase/*.
 */
export async function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const { default: Stripe } = await import("stripe");
  return new Stripe(key);
}

/**
 * Whether a connected account can actually receive a transfer yet — an
 * account having an id (profiles.stripe_account_id is set) only means
 * onboarding was *started*, not finished; Stripe doesn't flip this until
 * identity verification and bank details are both accepted. Dashboard
 * used to treat "has an id" as "done", so the button kept saying "Finish
 * payout setup" forever, even once the account was genuinely active.
 */
export async function getConnectAccountStatus(
  accountId: string
): Promise<"active" | "pending" | "unknown"> {
  const stripe = await getStripe();
  if (!stripe) return "unknown";
  try {
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient"],
    });
    const status =
      account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
    return status === "active" ? "active" : "pending";
  } catch {
    return "unknown";
  }
}
