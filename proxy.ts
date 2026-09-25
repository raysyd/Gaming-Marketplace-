import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not wired to Supabase yet — let every page through so the site still runs.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  // /cart included: a guest can still fill the side panel, but opening the
  // cart signs them in first — CartProvider then merges that guest cart
  // into the account's own.
  const guarded = ["/sell", "/dashboard", "/account", "/orders", "/buying", "/selling", "/builds/new", "/cart"];

  if (!user && guarded.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // A signed-in account with no username yet hasn't finished the
  // post-signup onboarding step — send it there before any page where
  // that identity actually shows up to someone else (selling, messaging,
  // checking out). Browsing, security settings and account deletion stay
  // reachable either way, and the onboarding page itself obviously can't
  // require having already been through it.
  if (user) {
    const needsIdentity = ["/sell", "/selling", "/buying", "/cart", "/messages"];
    const exempt =
      path.startsWith("/account/onboarding") ||
      path.startsWith("/account/security") ||
      path.startsWith("/account/delete");
    if (!exempt && needsIdentity.some((p) => path.startsWith(p))) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.username) {
        const url = request.nextUrl.clone();
        url.pathname = "/account/onboarding";
        url.searchParams.set("next", path);
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
