import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import type { ListingQuery } from "@/lib/types";

const MAX_PER_USER = 25;

/** Only the fields /shop's filters actually produce — never trust the
 * client to hand back an arbitrary object that ends up in a jsonb column
 * and later gets spread into a real query. */
function sanitizeQuery(input: unknown): ListingQuery {
  const q = (input ?? {}) as Record<string, unknown>;
  const out: ListingQuery = {};
  if (typeof q.q === "string") out.q = q.q.slice(0, 200);
  if (typeof q.category === "string") out.category = q.category.slice(0, 100);
  if (typeof q.sub === "string") out.sub = q.sub.slice(0, 100);
  if (Array.isArray(q.conditions)) out.conditions = q.conditions.filter((c) => typeof c === "string").slice(0, 10);
  if (Number.isFinite(Number(q.minPrice))) out.minPrice = Number(q.minPrice);
  if (Number.isFinite(Number(q.maxPrice))) out.maxPrice = Number(q.maxPrice);
  if (q.freeShipping) out.freeShipping = true;
  if (q.verifiedOnly) out.verifiedOnly = true;
  if (q.dealsOnly) out.dealsOnly = true;
  return out;
}

export async function POST(req: Request) {
  const limited = rateLimit(`saved-searches:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const payload = await req.json();
  const label = String(payload.label ?? "").trim().slice(0, 80) || "Saved search";

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save a search." }, { status: 401 });

  const { count } = await supabase
    .from("saved_searches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_PER_USER)
    return NextResponse.json(
      { error: `You can save up to ${MAX_PER_USER} searches — delete one first.` },
      { status: 403 }
    );

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({ user_id: user.id, label, query: sanitizeQuery(payload.query) })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { error } = await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
