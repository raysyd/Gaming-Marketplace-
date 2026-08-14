import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./config";

/**
 * Read-only client for public catalogue data (listings, search, counts).
 *
 * Deliberately does NOT read cookies. Anything that touches cookies is tied to
 * a specific user's request, which makes the page uncacheable and illegal to
 * call from generateStaticParams or during static generation. The catalogue is
 * the same for everyone, so it goes through here and stays cacheable.
 *
 * Anything that depends on who is signed in — posting a listing, sending a
 * message — uses the cookie-backed client in ./server instead.
 */
export function createPublicClient() {
  if (!hasSupabase) return null;
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
