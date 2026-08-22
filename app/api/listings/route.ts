import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { slugify, findTop, findSub } from "@/lib/taxonomy";
import { getConnectAccountStatus } from "@/lib/stripe";
import { nameFromEmail } from "@/lib/profile-name";

const MIN_PHOTOS = 5;
const MAX_PHOTOS = 10;

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

  // Never trust a client-submitted quantity past "is it a sane positive
  // integer" — this is what /api/checkout's reserve_listing_stock later
  // decrements against, so it's the one number here that directly bounds
  // how many units can ever be sold.
  const MAX_QUANTITY = 500;
  const quantity = Math.trunc(Number(payload.quantity));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY)
    return NextResponse.json(
      { error: `Quantity must be between 1 and ${MAX_QUANTITY}.` },
      { status: 400 }
    );

  // The uploader and the publish button both block outside 5–10, but this
  // is the boundary a client that skips the form can't get past.
  const photoCount = (payload.image ? 1 : 0) + (payload.images?.length ?? 0);
  if (photoCount < MIN_PHOTOS || photoCount > MAX_PHOTOS)
    return NextResponse.json(
      { error: `Listings need between ${MIN_PHOTOS} and ${MAX_PHOTOS} photos.` },
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  // The real payout-setup gate — app/sell/page.tsx checks this too so the
  // seller sees the prompt before filling out the form, but that's UX, not
  // enforcement. Skipped entirely when Stripe isn't configured (demo mode).
  if (process.env.STRIPE_SECRET_KEY) {
    const status = profile?.stripe_account_id
      ? await getConnectAccountStatus(profile.stripe_account_id)
      : "none";
    if (status !== "active")
      return NextResponse.json(
        { error: "Finish payout setup before publishing — connect a Stripe payout account from your dashboard." },
        { status: 403 }
      );
  }

  // Neither profiles.display_name nor listings.seller_name were ever
  // actually written anywhere — every real listing's seller showed up as
  // a bare "Seller" everywhere (cards, messages, reviews). Backfill from
  // the account's own email the first time, never overwriting a name set
  // some other way later.
  const sellerName = profile?.display_name || nameFromEmail(user.email) || "Seller";
  if (!profile?.display_name)
    await supabase.from("profiles").upsert({ id: user.id, display_name: sellerName });

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
      seller_name: sellerName,
      slug: slugify(payload.title),
      status: "active",
      stock: quantity,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The homepage rails are ISR-cached (revalidate = 60), and /shop's
  // listing queries are cached at the data layer (see lib/data.ts) —
  // without both, a brand-new listing wouldn't show up on either for up
  // to a minute.
  revalidatePath("/");
  revalidateTag("listings", { expire: 0 });
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
  revalidateTag("listings", { expire: 0 });
  if (data?.slug) revalidatePath(`/product/${id}/${data.slug}`);
  return NextResponse.json({ ok: true });
}
