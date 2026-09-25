import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { slugify, findSub, resolveCategory } from "@/lib/taxonomy";
import { getConnectAccountStatus } from "@/lib/stripe";
import { nameFromEmail } from "@/lib/profile-name";
import { getPremiumPlan, isPremiumActive } from "@/lib/premium";
import { isValidQuantity, MAX_LISTING_QUANTITY } from "@/lib/validation";
import type { SupabaseClient } from "@supabase/supabase-js";

const MIN_PHOTOS = 5;

/**
 * Everything a listing row can be created/updated with, straight off the
 * client payload — used identically whether the result lands as a draft
 * or gets published, so a draft's fields and a published listing's fields
 * never drift into two different shapes.
 */
function rowFromPayload(payload: Record<string, unknown>) {
  const { subcategorySlug, categorySlug } = resolveCategory(payload.subcategorySlug, payload.categorySlug);
  const quantity = Math.trunc(Number(payload.quantity));

  return {
    title: (payload.title as string)?.trim() || null,
    category: (payload.category as string) || findSub(subcategorySlug)?.name,
    category_slug: categorySlug,
    subcategory_slug: subcategorySlug,
    condition: (payload.condition as string) || null,
    state: (payload.stateCode as string) || null,
    // A draft's price is optional (supabase/14-draft-listings.sql makes
    // the column nullable) — 0/empty/NaN all mean "not set yet", not $0.
    price: Number(payload.price) > 0 ? Number(payload.price) : null,
    location: (payload.location as string) || null,
    description: (payload.description as string) || null,
    specs: payload.specs ?? [],
    image: (payload.image as string) || null,
    images: payload.images ?? [],
    benchmark_images: payload.benchmarkImages ?? [],
    ships_free: Boolean(payload.shipsFree),
    accepts_offers: payload.acceptsOffers !== false,
    pickup_available: Boolean(payload.pickupAvailable),
    weight_grams: Number(payload.weightGrams) > 0 ? Math.round(Number(payload.weightGrams)) : null,
    stock: isValidQuantity(quantity) ? quantity : 1,
  };
}

/**
 * The real publish gate — everything a listing needs to actually go live,
 * whether it's a brand-new POST or an existing draft being flipped to
 * "active" via PATCH. Client-side (SellForm) mirrors all of this for UX,
 * but this is the one place it's actually enforced.
 */
async function assertPublishable(
  supabase: SupabaseClient,
  userId: string,
  row: ReturnType<typeof rowFromPayload>,
  photoCount: number
): Promise<{ error: string; status: number } | null> {
  if (!row.title || !row.price)
    return { error: "A title and a price are required.", status: 400 };
  if (photoCount < MIN_PHOTOS)
    return { error: `Listings need at least ${MIN_PHOTOS} photos.`, status: 400 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, premium_status")
    .eq("id", userId)
    .maybeSingle();

  if (process.env.STRIPE_SECRET_KEY) {
    const status = profile?.stripe_account_id
      ? await getConnectAccountStatus(profile.stripe_account_id)
      : "none";
    if (status !== "active")
      return {
        error: "Finish payout setup before publishing — connect a Stripe payout account from your dashboard.",
        status: 403,
      };
  }

  const plan = await getPremiumPlan();
  const premium = isPremiumActive(profile?.premium_status);
  const maxPhotos = premium ? plan.premiumMaxPhotos : plan.freeMaxPhotos;
  if (photoCount > maxPhotos)
    return {
      error: `Listings can have up to ${maxPhotos} photos${premium ? "" : " on the free plan"}.`,
      status: 400,
    };

  const listingLimit = premium ? plan.premiumListingLimit : plan.freeListingLimit;
  const { count: activeCount } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", userId)
    .eq("status", "active");
  if ((activeCount ?? 0) >= listingLimit)
    return {
      error: premium
        ? `You're at your ${listingLimit}-listing limit.`
        : `You're at the free ${listingLimit}-listing limit — upgrade to Premium Seller for more.`,
      status: 403,
    };

  return null;
}

export async function POST(req: Request) {
  const payload = await req.json();
  const asDraft = payload.status === "draft";
  // An existing draft's id, present only for an autosave update (see
  // components/SellForm.tsx) — a much lower-risk, much more frequent
  // operation than creating a brand new row, so it gets its own, more
  // generous rate limit rather than sharing the 10/min meant to bound
  // actual listing creation.
  const autosaveId = asDraft && typeof payload.id === "string" ? payload.id : null;

  const limited = autosaveId
    ? rateLimit(`listings-autosave:${clientKey(req)}`, { limit: 60 })
    : rateLimit(`listings:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const row = rowFromPayload(payload);
  const photoCount = (row.image ? 1 : 0) + ((row.images as string[])?.length ?? 0);

  // A draft only ever needs a title — everything else about "is this
  // actually ready to sell" is the publish-time gate below, not a reason
  // to lose an afternoon's half-finished listing.
  if (asDraft && !row.title)
    return NextResponse.json({ error: "Add a title to save a draft." }, { status: 400 });
  if (!asDraft && (!row.title || !row.price))
    return NextResponse.json({ error: "A title and a price are required." }, { status: 400 });

  const quantity = Math.trunc(Number(payload.quantity));
  if (!asDraft && !isValidQuantity(quantity))
    return NextResponse.json(
      { error: `Quantity must be between 1 and ${MAX_LISTING_QUANTITY}.` },
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

  // Autosave updating a draft it already created earlier in this same
  // editing session — never publishes (status stays "draft" regardless
  // of anything else in the payload), so this path never needs
  // assertPublishable at all, and is safe to fire from a
  // navigator.sendBeacon() call on tab-close that can't wait for or read
  // a response.
  if (autosaveId) {
    const { data, error } = await supabase
      .from("listings")
      .update({ ...row, slug: row.title ? slugify(row.title) : null })
      .eq("id", autosaveId)
      .eq("seller_id", user.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Not found isn't an error here — the draft may have already been
    // published or discarded in another tab since this autosave was
    // scheduled. Nothing to update, nothing to report as a failure.
    return NextResponse.json({ ok: true, id: data?.id ?? autosaveId });
  }

  if (!asDraft) {
    const publishError = await assertPublishable(supabase, user.id, row, photoCount);
    if (publishError) return NextResponse.json({ error: publishError.error }, { status: publishError.status });
  }

  // Neither profiles.display_name nor listings.seller_name were ever
  // actually written anywhere — every real listing's seller showed up as
  // a bare "Seller" everywhere (cards, messages, reviews). Backfill from
  // the account's own email the first time, never overwriting a name set
  // some other way later.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const sellerName = profile?.display_name || profile?.username || nameFromEmail(user.email) || "Seller";
  if (!profile?.display_name)
    await supabase.from("profiles").upsert({ id: user.id, display_name: sellerName });

  const { data, error } = await supabase
    .from("listings")
    .insert({
      ...row,
      seller_id: user.id,
      seller_name: sellerName,
      slug: row.title ? slugify(row.title) : null,
      status: asDraft ? "draft" : "active",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!asDraft) {
    // The homepage rails are ISR-cached (revalidate = 60), and /shop's
    // listing queries are cached at the data layer (see lib/data.ts) —
    // without both, a brand-new listing wouldn't show up on either for up
    // to a minute.
    revalidatePath("/");
    revalidateTag("listings", { expire: 0 });
  }
  return NextResponse.json({ ok: true, id: data.id, slug: row.title ? slugify(row.title) : "" });
}

export async function PATCH(req: Request) {
  const limited = rateLimit(`listings-patch:${clientKey(req)}`, { limit: 20 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const payload = await req.json();
  const { id } = payload;
  if (!id) return NextResponse.json({ error: "Missing listing id." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage listings." }, { status: 401 });

  const { data: existing, error: existingError } = await supabase
    .from("listings")
    .select("id, status")
    .eq("id", id)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (existingError || !existing)
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  // Taking a listing down — unchanged from before draft support existed.
  if (payload.status === "inactive") {
    const { data, error } = await supabase
      .from("listings")
      .update({ status: "inactive" })
      .eq("id", id)
      .eq("seller_id", user.id)
      .select("slug")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/");
    revalidateTag("listings", { expire: 0 });
    if (data?.slug) revalidatePath(`/product/${id}/${data.slug}`);
    return NextResponse.json({ ok: true });
  }

  // Publishing — either a fresh submit that already went through
  // assertPublishable via a status:"active" PATCH on a draft, or (rarely)
  // re-publishing an inactive listing. Runs the exact same gate a brand
  // new listing does; a draft never had to pass any of it to be *saved*.
  if (payload.status === "active") {
    const row = rowFromPayload(payload);
    const photoCount = (row.image ? 1 : 0) + ((row.images as string[])?.length ?? 0);
    const publishError = await assertPublishable(supabase, user.id, row, photoCount);
    if (publishError) return NextResponse.json({ error: publishError.error }, { status: publishError.status });

    const { data, error } = await supabase
      .from("listings")
      .update({ ...row, slug: row.title ? slugify(row.title) : null, status: "active" })
      .eq("id", id)
      .eq("seller_id", user.id)
      .select("id, slug")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/");
    revalidateTag("listings", { expire: 0 });
    return NextResponse.json({ ok: true, id: data.id, slug: data.slug ?? "" });
  }

  // Plain draft save — no gate beyond owning the row and having a title.
  // Only reachable for a row that's still a draft; publishing (above) or
  // taking a live listing down (above) are the only other transitions.
  if (existing.status !== "draft")
    return NextResponse.json({ error: "This listing has already been published." }, { status: 400 });

  const row = rowFromPayload(payload);
  if (!row.title)
    return NextResponse.json({ error: "Add a title to save a draft." }, { status: 400 });

  const { error } = await supabase
    .from("listings")
    .update({ ...row, slug: row.title ? slugify(row.title) : null })
    .eq("id", id)
    .eq("seller_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}

/** Permanently discards a draft — a draft is never publicly visible (see
 * supabase/14-draft-listings.sql's comment), so unlike a published
 * listing there's nothing else referencing it and no reason to keep a
 * "taken down" record around instead. Scoped to drafts only: a published
 * listing has to go through "Take down" (PATCH, status: inactive)
 * instead, which keeps its history rather than erasing it. */
export async function DELETE(req: Request) {
  const limited = rateLimit(`listings-delete:${clientKey(req)}`, { limit: 20 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing listing id." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage listings." }, { status: 401 });

  const { data, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("seller_id", user.id)
    .eq("status", "draft")
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length)
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
