import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { slugify, findTop, findSub } from "@/lib/taxonomy";

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

  // Validate against the real taxonomy rather than trusting the client —
  // falls back to a sane default instead of writing an orphaned slug that
  // would never match a category filter.
  const sub = findSub(payload.subcategorySlug);
  const subcategorySlug = sub?.slug ?? "graphics-cards";
  const categorySlug =
    findTop(payload.categorySlug)?.slug ?? sub?.parent ?? "pc-parts-and-components";

  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: payload.title,
      category: payload.category || findSub(subcategorySlug)?.name,
      category_slug: categorySlug,
      subcategory_slug: subcategorySlug,
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

  // The homepage rails are ISR-cached (revalidate = 60) — without this a
  // brand-new listing wouldn't show up there for up to a minute.
  revalidatePath("/");
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

  const { data, error } = await supabase
    .from("listings")
    .update({ status: "inactive" })
    .eq("id", id)
    .eq("seller_id", user.id)
    .select("slug")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Same ISR staleness as above, in reverse: the homepage (revalidate = 60)
  // and this listing's own product page (revalidate = 120) would otherwise
  // keep serving the cached "active" version — with a real photo, price,
  // and buy box — for up to two minutes after the seller takes it down.
  revalidatePath("/");
  if (data?.slug) revalidatePath(`/product/${id}/${data.slug}`);
  return NextResponse.json({ ok: true });
}
