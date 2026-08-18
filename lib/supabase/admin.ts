import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role client — bypasses Row Level Security entirely.
 *
 * Only import this from server-only code that has already done its own
 * authorization check: a Stripe webhook (which has no user session to
 * check RLS against at all) or a route that verified the caller against
 * the specific row it's about to write (e.g. "is this user the buyer on
 * this order?") before reaching for this client. Never import it from
 * anything that runs in, or could be bundled for, the browser — the
 * service role key must never leave the server.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
