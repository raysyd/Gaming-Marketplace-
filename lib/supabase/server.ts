import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from "./config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  if (!hasSupabase) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: CookieToSet[]) => {
        try {
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * auth.getUser() is a real network round-trip to Supabase's Auth server on
 * every call — by design, it revalidates the token server-side rather than
 * trusting a locally-decoded JWT. Without this, a page that needs the user
 * in more than one place (like /dashboard, which needs it in three separate
 * data functions) pays that round-trip three times on every single load.
 * React's cache() dedupes it to once per request.
 */
export const getAuthedUser = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
}> => {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
