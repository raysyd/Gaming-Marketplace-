import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Password sign-in, done on the server so the per-account lockout can't be
 * tampered with. The lockout functions (signin_attempts_blocked,
 * record_failed_signin, clear_signin_attempts) are service-role only
 * (supabase/26-lock-down-rpc.sql): when the browser could call them,
 * anyone could clear an account's lockout between guesses, or lock a real
 * user out by recording failures against their email.
 *
 * The session cookie is written by the server client on success, so the
 * browser just does a hard navigation afterwards.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(`signin:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many sign-in attempts. Wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email.includes("@") || !password)
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ error: "Sign-in is not configured." }, { status: 500 });
  const admin = createAdminClient();

  // Fails open if the lockout isn't available (no service key locally, or
  // the migration not run): Supabase's own IP rate limits still apply.
  if (admin) {
    const { data: blocked } = await admin.rpc("signin_attempts_blocked", { p_email: email });
    if (blocked)
      return NextResponse.json(
        { error: "Too many failed attempts for this account. Try again in 15 minutes, or reset your password." },
        { status: 429 }
      );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const wrong = /invalid login credentials/i.test(error.message);
    if (admin && wrong) await admin.rpc("record_failed_signin", { p_email: email });
    return NextResponse.json(
      { error: wrong ? "Wrong email or password." : error.message },
      { status: wrong ? 401 : 400 }
    );
  }
  if (admin) await admin.rpc("clear_signin_attempts", { p_email: email });
  return NextResponse.json({ ok: true });
}
