import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { slugify } from "@/lib/taxonomy";

export async function POST(req: Request) {
  const limited = rateLimit(`listings:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const payload = await req.json();
  if (!payload.title?.trim() || !payload.price)
    return NextResponse.json(
      { error: "A title and a price are required." },
      { status: 400 }
    );

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Sign in to publish a listing." },
      { status: 401 }
    );

  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: payload.title,
      category: payload.category,
      condition: payload.condition,
      price: payload.price,
      location: payload.location,
      description: payload.description,
      specs: payload.specs ?? [],
      image: payload.image ?? null,
      images: payload.images ?? [],
      ships_free: payload.shipsFree,
      accepts_offers: payload.acceptsOffers,
      seller_id: user.id,
      slug: slugify(payload.title),
      status: "active",
      stock: 1,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, slug: slugify(payload.title) });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  if (!id || status !== "inactive")
    return NextResponse.json({ error: "Invalid listing update." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage listings." }, { status: 401 });

  const { error } = await supabase
    .from("listings")
    .update({ status: "inactive" })
    .eq("id", id)
    .eq("seller_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
