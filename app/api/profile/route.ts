import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isValidUsername } from "@/lib/validation";

/**
 * Creates or updates the signed-in user's own profile — used by both the
 * post-signup onboarding step and the account settings page. Everything
 * here is editable at any time except username, which this route only
 * ever sets once; supabase/07-profiles.sql's immutability trigger is the
 * actual backstop against a second write route, a direct table edit, or
 * a bug here ever changing it later.
 */
export async function POST(req: Request) {
  const limited = rateLimit(`profile:${clientKey(req)}`, { limit: 20 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const payload = await req.json();

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });

  const { data: existing } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const update: Record<string, unknown> = { id: user.id };

  if (payload.displayName !== undefined) {
    const displayName = String(payload.displayName ?? "").trim();
    if (!displayName) update.display_name = null;
    else update.display_name = displayName.slice(0, 80);
  }

  if (payload.username !== undefined) {
    const username = String(payload.username).trim().toLowerCase();
    if (existing?.username) {
      // Silently dropping a resubmitted-but-unchanged value would be
      // surprising too, so only actually reject an attempt to change it.
      if (username !== existing.username)
        return NextResponse.json(
          { error: "Usernames are permanent and can't be changed." },
          { status: 400 }
        );
    } else {
      if (!isValidUsername(username))
        return NextResponse.json(
          { error: "Username must be 3-20 characters: lowercase letters, numbers, underscores." },
          { status: 400 }
        );
      update.username = username;
    }
  }

  if (payload.avatarUrl !== undefined) update.avatar_url = payload.avatarUrl || null;
  if (payload.bio !== undefined) update.bio = String(payload.bio).slice(0, 500);
  if (payload.suburb !== undefined) update.suburb = String(payload.suburb).slice(0, 80);
  if (payload.state !== undefined) update.state = String(payload.state).slice(0, 40);

  if (payload.bannerUrl !== undefined) update.banner_url = payload.bannerUrl || null;
  if (payload.policyNote !== undefined) update.policy_note = String(payload.policyNote).slice(0, 500);
  if (payload.contactLink !== undefined) {
    const link = String(payload.contactLink).trim();
    if (!link) update.contact_link = null;
    else if (!/^https:\/\/.+/i.test(link))
      return NextResponse.json(
        { error: "Contact link must start with https://." },
        { status: 400 }
      );
    else update.contact_link = link.slice(0, 300);
  }

  const { error } = await supabase.from("profiles").upsert(update);
  if (error) {
    // The unique index (profiles_username_idx) is the real guarantee
    // against a race between two people claiming the same username at
    // once — this just turns its violation into a readable message
    // instead of a raw constraint-name error.
    const message = error.code === "23505"
      ? "That username is already taken."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
