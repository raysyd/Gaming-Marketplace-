import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic links land here, not on the destination page.
 *
 * Supabase sends a one-time `code` in the URL. It has to be exchanged for a
 * session and written to cookies before the user is actually signed in —
 * without this step the link "works" (no error) but leaves you logged out,
 * because nothing ever turned the code into a session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code)
    return NextResponse.redirect(`${origin}/login?error=missing_code`);

  const supabase = await createClient();
  if (!supabase)
    return NextResponse.redirect(`${origin}/login?error=not_configured`);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );

  // Behind a proxy the forwarded host is the real one the user typed.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `https://${forwardedHost}`;

  return NextResponse.redirect(`${base}${next}`);
}
