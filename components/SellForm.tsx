"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import { PhotoUploader } from "@/components/PhotoUploader";
import { TAXONOMY, findTop, findSub, slugify } from "@/lib/taxonomy";
import { SUGGESTED_SPECS } from "@/lib/specs";
import { attributesFor } from "@/lib/attributes";
import { ConnectPayoutButton } from "@/components/ConnectPayoutButton";
import { ListingUsageBar } from "@/components/ListingUsageBar";
import { AU_STATES } from "@/lib/au-states";
import type { Listing } from "@/lib/types";

const CONDITIONS = ["New", "Like new", "Used", "For parts"];
const DEFAULT_TOP = "pc-parts-and-components";
const DEFAULT_SUB = "graphics-cards";
const MIN_PHOTOS = 5;
/** Which draft to come back to on a bare /sell visit — the "close the
 * tab, come back later" case a URL alone can't cover. */
const DRAFT_STORAGE_KEY = "sidegrade.sell.draftId";
/** How long to let typing settle before autosaving — long enough that a
 * fast typist doesn't trigger a save on every character, short enough
 * that switching tabs mid-sentence rarely loses anything. */
const AUTOSAVE_DEBOUNCE_MS = 1500;

/**
 * `payoutsReady` comes from the server (app/sell/page.tsx) — true when
 * Stripe isn't configured at all (demo mode, nothing to gate) or when the
 * signed-in seller's Connect account can actually receive a transfer.
 * Mirrored server-side in POST /api/listings, which is the real gate —
 * this only saves a seller the round trip of filling out the whole form
 * first.
 *
 * `maxPhotos`, `listingLimit` and `activeListingCount` are Premium
 * Seller-aware (see lib/premium.ts) — also re-enforced in POST
 * /api/listings for the same reason payoutsReady is.
 */
export function SellForm({
  payoutsReady,
  payoutStatus = "none",
  maxPhotos = 10,
  listingLimit = 10,
  activeListingCount = 0,
  premium = false,
  initialDraft,
  staleDraftParam = false,
}: {
  payoutsReady: boolean;
  payoutStatus?: "none" | "pending" | "active" | "unknown";
  maxPhotos?: number;
  listingLimit?: number;
  activeListingCount?: number;
  premium?: boolean;
  /** Resuming an in-progress draft (app/sell/page.tsx?draft=<id>) — prefills
   * everything below instead of a blank form. */
  initialDraft?: Listing;
  /** A ?draft= id was given but didn't resolve to a real, still-draft
   * listing of this seller's — see the auto-resume effect below. */
  staleDraftParam?: boolean;
}) {
  const router = useRouter();
  const atListingLimit = activeListingCount >= listingLimit;
  const [form, setForm] = useState({
    title: initialDraft?.title ?? "",
    categorySlug: initialDraft?.categorySlug ?? DEFAULT_TOP,
    subcategorySlug: initialDraft?.subcategorySlug ?? DEFAULT_SUB,
    condition: initialDraft?.condition ?? "Used",
    price: initialDraft?.price ? String(initialDraft.price) : "",
    quantity: initialDraft ? String(initialDraft.stock || 1) : "1",
    location: initialDraft?.location ?? "",
    stateCode: initialDraft?.state ?? "",
    weightGrams: initialDraft?.weightGrams ? String(initialDraft.weightGrams) : "",
    description: initialDraft?.description ?? "",
    shipsFree: initialDraft?.shipsFree ?? true,
    acceptsOffers: initialDraft?.acceptsOffers ?? true,
    pickupAvailable: initialDraft?.pickupAvailable ?? false,
  });
  const [specs, setSpecs] = useState(
    initialDraft?.specs?.length ? initialDraft.specs : [{ label: "", value: "" }]
  );
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>(
    initialDraft ? [initialDraft.image, ...(initialDraft.images ?? [])].filter(Boolean) : []
  );
  const [benchmarkPhotos, setBenchmarkPhotos] = useState<string[]>(initialDraft?.benchmarkImages ?? []);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setErrorMsg] = useState("");
  const [listingId, setListingId] = useState("");
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  // Set once this draft (or a brand new one) has a real row in the
  // database — every subsequent "Save draft" updates that same row
  // (PATCH) instead of creating a new one each time.
  const [draftId, setDraftId] = useState(initialDraft?.id ?? "");
  const [draftState, setDraftState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftError, setDraftError] = useState("");

  const upgrade = async () => {
    setUpgradeBusy(true);
    try {
      const res = await fetch("/api/premium/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // No url and no throw — button just stops spinning; /account/
      // PremiumCard is still reachable directly if this keeps failing.
    }
    setUpgradeBusy(false);
  };

  const price = Number(form.price) || 0;
  const quantity = Math.max(1, Number(form.quantity) || 1);
  const fee = Math.round((price * BRAND.feePercent) / 100);
  const subOptions = findTop(form.categorySlug)?.children ?? [];
  // Generic per-subcategory required fields (storage type, cooling type, …) —
  // adding a new one to lib/attributes.ts is enough; nothing here branches
  // on which subcategory it is.
  const subAttrs = attributesFor(form.subcategorySlug);
  const missingAttr = subAttrs.find((a) => a.required && !attrs[a.key]?.trim());

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const changeTopCategory = (topSlug: string) => {
    const top = findTop(topSlug);
    const nextSub = top?.children[0]?.slug ?? form.subcategorySlug;
    setForm((f) => ({ ...f, categorySlug: topSlug, subcategorySlug: nextSub }));
    setAttrs({});
  };

  const changeSubCategory = (subSlug: string) => {
    set("subcategorySlug", subSlug);
    setAttrs({});
  };

  // Non-destructive: only adds suggested labels that aren't already on the
  // form, never touches specs the seller has already filled in.
  const suggestSpecs = () => {
    const suggested = SUGGESTED_SPECS[form.subcategorySlug] ?? [];
    const existingLabels = new Set(specs.map((s) => s.label.toLowerCase()));
    const toAdd = suggested.filter((label) => !existingLabels.has(label.toLowerCase()));
    if (!toAdd.length) return;
    setSpecs((p) => {
      const base = p.filter((s) => s.label || s.value);
      return [...base, ...toAdd.map((label) => ({ label, value: "" }))];
    });
  };

  // Shared by both a fresh submit and a draft save — the same shape
  // either way, so a draft's fields and a published listing's fields
  // never drift apart.
  const buildPayload = () => {
    const attrSpecs = subAttrs
      .filter((a) => attrs[a.key]?.trim())
      .map((a) => ({ label: a.label, value: attrs[a.key].trim() }));
    return {
      ...form,
      category: findSub(form.subcategorySlug)?.name ?? "",
      price,
      quantity,
      specs: [...attrSpecs, ...specs.filter((s) => s.label && s.value)],
      image: photos[0] ?? "",
      images: photos.slice(1),
      benchmarkImages: benchmarkPhotos,
    };
  };

  /**
   * Save whatever's filled in so far without publishing — the only real
   * requirement is a title, the same low bar an email draft has. Always
   * POSTs with the draft's own id once it has one (server-side: an
   * existing draft gets updated in place, never duplicated) — the same
   * call whether a person clicked "Save as draft" or the autosave effect
   * below fired on its own, so there's exactly one save path to reason
   * about.
   */
  const persistDraft = async () => {
    if (!form.title.trim()) return;
    setDraftState("saving");
    setDraftError("");
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), status: "draft", id: draftId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.id) setDraftId(data.id);
      setDraftState("saved");
    } catch (e) {
      setDraftError(e instanceof Error && e.message ? e.message : "Couldn't save the draft.");
      setDraftState("error");
    }
  };

  // Auto-resume: a bare /sell visit (no ?draft= in the URL) with a draft
  // id remembered from an earlier session picks up right where it left
  // off — this is what makes "close the tab, come back later" actually
  // work, not just "click Save as draft first." A stale id (already
  // published or discarded elsewhere) gets forgotten instead of retried
  // forever — see staleDraftParam's comment in app/sell/page.tsx.
  useEffect(() => {
    if (initialDraft) return;
    try {
      if (staleDraftParam) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) router.replace(`/sell?draft=${saved}`);
    } catch {
      // Storage can throw in a locked-down browser context — worst case,
      // this visit just starts blank instead of resuming.
    }
    // Only ever meant to run once, on the very first render of this page
    // load — re-running on every render would fight the redirect it just
    // issued.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remember (or forget) which row is this draft, so the effect above has
  // something to come back to. Cleared once published — there's no draft
  // left to resume at that point.
  useEffect(() => {
    try {
      if (draftId && state !== "done") localStorage.setItem(DRAFT_STORAGE_KEY, draftId);
      else if (state === "done") localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
  }, [draftId, state]);

  // The actual "automatic" part: save on a short debounce after any
  // change, so there's rarely anything left un-persisted by the time a
  // tab gets switched away from or closed. Skipped once published (state
  // "done") or mid-publish ("saving") — nothing left to draft-save at
  // that point.
  useEffect(() => {
    if (!form.title.trim() || state === "done" || state === "saving") return;
    const timer = setTimeout(() => {
      persistDraft();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // Deliberately broad — any field on the listing should reset the
    // debounce timer, not just title/price.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, specs, attrs, photos, benchmarkPhotos, state]);

  // Last-resort save for the moment the tab is actually closed or
  // navigated away from — a normal fetch() can be cancelled mid-flight
  // when the page unloads, but sendBeacon is specifically designed to
  // survive it. Fire-and-forget: there's no response to read, so this
  // can't update draftId — if the debounced autosave above never got a
  // chance to run even once (title typed and the tab closed within
  // ~1.5s), the resulting draft still saves, it's just only discoverable
  // from the Drafts tab rather than auto-resumed by this effect above.
  useEffect(() => {
    const flush = () => {
      if (!form.title.trim() || state === "done") return;
      const body = JSON.stringify({ ...buildPayload(), status: "draft", id: draftId || undefined });
      navigator.sendBeacon?.("/api/listings", new Blob([body], { type: "application/json" }));
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, specs, attrs, photos, benchmarkPhotos, draftId, state]);

  const submit = async () => {
    if (!payoutsReady) {
      setErrorMsg("Finish payout setup before publishing — see above.");
      setState("error");
      return;
    }
    if (atListingLimit) {
      setErrorMsg(
        `You're at your ${listingLimit}-listing limit. Take one down, or upgrade to Premium Seller for more.`
      );
      setState("error");
      return;
    }
    if (!form.title.trim() || !price) {
      setErrorMsg("Add a title and a price above zero, then try again.");
      setState("error");
      return;
    }
    if (photos.length < MIN_PHOTOS) {
      setErrorMsg(`Add at least ${MIN_PHOTOS} photos before publishing.`);
      setState("error");
      return;
    }
    if (missingAttr) {
      setErrorMsg(`${missingAttr.label} is required for ${findSub(form.subcategorySlug)?.name}.`);
      setState("error");
      return;
    }
    setState("saving");
    try {
      // A draft being published updates its existing row and flips it to
      // "active" (PATCH) rather than inserting a second, duplicate one.
      const res = draftId
        ? await fetch("/api/listings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: draftId, status: "active", ...buildPayload() }),
          })
        : await fetch("/api/listings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPayload()),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setListingId(data.id ?? draftId ?? "");
      setState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error && e.message ? e.message : "Couldn't publish. Try again.");
      setState("error");
    }
  };

  if (state === "done")
    return (
      <div className="mx-auto max-w-[560px] px-4 py-24 text-center">
        <p className="eyebrow text-good">Listing live</p>
        <h1 className="display mt-2 text-[clamp(30px,4vw,42px)]">{form.title} is on the market.</h1>
        <p className="mt-3 text-[14px] text-muted">
          Buyers can message you from the listing. You&apos;ll get{" "}
          {money(price - fee)} once delivery is confirmed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/selling"
            className="btn btn-dark btn-sm"
          >
            View your listings
          </Link>
          {listingId && (
            <Link
              href={`/product/${listingId}/${slugify(form.title)}`}
              className="btn btn-outline btn-sm"
            >
              View listing
            </Link>
          )}
          <button
            onClick={() => setState("idle")}
            className="rounded-md border border-line px-5 py-2.5 text-[13px] font-semibold"
          >
            List another
          </button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 lg:px-6">
      <p className="eyebrow">Sell{draftId && " · editing draft"}</p>
      <h1 className="display mt-2 text-[36px]">List an item</h1>
      <p className="mt-2 max-w-lg text-[15px] text-muted">
        Listing is free. {BRAND.name} takes {BRAND.feePercent}% only when the item
        sells and the buyer confirms delivery.
        {draftId && " Saved as a draft — it isn't visible to anyone until you publish it."}
      </p>
      <div className="max-w-xs">
        <ListingUsageBar count={activeListingCount} limit={listingLimit} />
      </div>

      {!payoutsReady && (
        <div className="mt-6 rounded-[10px] border border-trust bg-trust/5 p-5">
          <p className="text-[14px] font-semibold">Finish payout setup to publish</p>
          <p className="mt-1 max-w-lg text-[13.5px] text-muted">
            Connect a Stripe payout account before listing — that&apos;s how
            you&apos;ll actually get paid once a sale is delivered and confirmed.
          </p>
          <ConnectPayoutButton status={payoutStatus} />
        </div>
      )}

      {payoutsReady && atListingLimit && (
        <div className="mt-6 rounded-[10px] border border-line bg-paper p-5">
          <p className="text-[14px] font-semibold">
            You&apos;ve reached your {listingLimit}-listing limit
          </p>
          <p className="mt-1 max-w-lg text-[13.5px] text-muted">
            {premium
              ? "Take a listing down to free up a slot."
              : "Take a listing down, or upgrade to Premium Seller for a higher limit and more photos per listing."}
          </p>
          {!premium && (
            <button
              type="button"
              onClick={upgrade}
              disabled={upgradeBusy}
              className="btn btn-dark btn-sm mt-3"
            >
              {upgradeBusy ? "Loading…" : "Upgrade to Premium Seller"}
            </button>
          )}
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
        <Step n={1} title="The item" hint="What you're selling and what condition it's in.">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="RTX 4070 Ti build — 7600X / 32GB DDR5"
              className="input"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={form.categorySlug}
                onChange={(e) => changeTopCategory(e.target.value)}
                className="input"
              >
                {TAXONOMY.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Subcategory">
              <select
                value={form.subcategorySlug}
                onChange={(e) => changeSubCategory(e.target.value)}
                className="input"
              >
                {subOptions.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Condition">
            <select
              value={form.condition}
              onChange={(e) => set("condition", e.target.value)}
              className="input max-w-[220px]"
            >
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>

          {subAttrs.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {subAttrs.map((a) => (
                <Field key={a.key} label={`${a.label}${a.required ? " *" : ""}`}>
                  {a.kind === "select" ? (
                    <select
                      value={attrs[a.key] ?? ""}
                      onChange={(e) =>
                        setAttrs((p) => ({ ...p, [a.key]: e.target.value }))
                      }
                      className="input"
                    >
                      <option value="">Select…</option>
                      {a.options?.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={attrs[a.key] ?? ""}
                      onChange={(e) =>
                        setAttrs((p) => ({ ...p, [a.key]: e.target.value }))
                      }
                      placeholder={a.placeholder}
                      className="input"
                    />
                  )}
                </Field>
              ))}
            </div>
          )}

        </Step>
        <Step n={2} title="Price & shipping" hint="Buyers see the price first. Free shipping listings get a badge.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={`Asking price (${BRAND.currency})`}>
              <input
                value={form.price}
                onChange={(e) => set("price", e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="1990"
                className="input"
              />
            </Field>
            <Field label="Quantity">
              <input
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="1"
                className="input"
              />
            </Field>
            <Field label="Ships from">
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Adelaide"
                className="input"
              />
            </Field>
            <Field label="State">
              <select value={form.stateCode} onChange={(e) => set("stateCode", e.target.value)} className="input">
                <option value="">Select…</option>
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Weight in grams (optional)">
              <input
                value={form.weightGrams}
                onChange={(e) => set("weightGrams", e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 1500"
                className="input"
              />
              <p className="hint">Powers the estimated-shipping figure buyers see.</p>
            </Field>
          </div>

        </Step>
        <Step n={3} title="Photos" hint="Real photos of the actual item. Listings with 5+ photos sell faster.">
          <Field label={`Photos — ${photos.length} of ${MIN_PHOTOS} minimum (up to ${maxPhotos})`}>
            <PhotoUploader photos={photos} onChange={setPhotos} min={MIN_PHOTOS} max={maxPhotos} />
          </Field>

          <Field label={`Benchmark screenshots (optional) — ${benchmarkPhotos.length} of 6`}>
            <PhotoUploader photos={benchmarkPhotos} onChange={setBenchmarkPhotos} min={0} max={6} />
            <p className="hint">
              GPU-Z, CPU-Z, 3DMark, Cinebench, CrystalDiskInfo — real proof beats a
              claim. Adds a "Performance Verified" badge to your listing.
            </p>
          </Field>

        </Step>
        <Step n={4} title="Specs & description" hint="Specs power the performance scores and filters buyers use.">
          <Field label="Specs — these are what buyers actually filter on">
            <div className="space-y-2">
              {specs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={s.label}
                    onChange={(e) =>
                      setSpecs((p) =>
                        p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                      )
                    }
                    placeholder="GPU"
                    className="input w-1/3"
                  />
                  <input
                    value={s.value}
                    onChange={(e) =>
                      setSpecs((p) =>
                        p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                      )
                    }
                    placeholder="RTX 4070 Ti 12GB"
                    className="input flex-1"
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSpecs((p) => [...p, { label: "", value: "" }])}
                  className="spec rounded border border-line px-2.5 py-1.5 font-medium"
                >
                  + Add spec
                </button>
                {SUGGESTED_SPECS[form.subcategorySlug] && (
                  <button
                    type="button"
                    onClick={suggestSpecs}
                    className="btn btn-outline btn-sm"
                  >
                    + Suggest fields for {findSub(form.subcategorySlug)?.name}
                  </button>
                )}
              </div>
            </div>
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              placeholder="How long you've had it, how it was used, what's included."
              className="input resize-y"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Free shipping"
              hint="Buyers filter for this first — it's one of the biggest reasons a listing gets picked over another."
              on={form.shipsFree}
              onChange={() => set("shipsFree", !form.shipsFree)}
            />
            <Toggle
              label="Accept offers"
              hint="Lets buyers negotiate instead of scrolling past. Most sales here start with an offer."
              on={form.acceptsOffers}
              onChange={() => set("acceptsOffers", !form.acceptsOffers)}
            />
            <Toggle
              label="Local pickup available"
              hint="Buyer still pays through Sidegrade first — payment stays held until they confirm they've collected it, same protection as shipping."
              on={form.pickupAvailable}
              onChange={() => set("pickupAvailable", !form.pickupAvailable)}
            />
          </div>
        </Step>

        <div className="space-y-3 panel p-5">
          {state === "error" && <p className="spec text-deal">{error}</p>}
          {draftState === "error" && <p className="spec text-deal">{draftError}</p>}
          {draftState === "saving" && <p className="spec text-muted">Saving draft…</p>}
          {draftState === "saved" && (
            <p className="spec font-semibold text-good">
              Draft saved — it keeps saving automatically, and closing the tab won&apos;t lose it.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={persistDraft}
              disabled={draftState === "saving" || !form.title.trim()}
              className="h-[50px] rounded-[10px] border border-line text-[14px] font-semibold transition hover:border-ink/40 disabled:opacity-50 sm:w-48"
            >
              {draftState === "saving" ? "Saving…" : "Save now"}
            </button>
            <button
              onClick={submit}
              disabled={
                state === "saving" ||
                photos.length < MIN_PHOTOS ||
                !!missingAttr ||
                !payoutsReady ||
                atListingLimit
              }
              className="btn btn-primary btn-lg flex-1"
            >
              {state === "saving"
                ? "Publishing…"
                : !payoutsReady
                  ? "Finish payout setup first"
                  : atListingLimit
                    ? "Listing limit reached"
                    : photos.length < MIN_PHOTOS
                      ? `Add ${MIN_PHOTOS - photos.length} more photo${MIN_PHOTOS - photos.length === 1 ? "" : "s"}`
                      : "Publish listing"}
            </button>
          </div>
        </div>
        </div>

        <aside className="h-fit space-y-4 panel p-6 lg:sticky lg:top-[calc(var(--header-offset,140px)+16px)]">
          <h2 className="text-[18px] font-bold">What you take home</h2>
          <div className="space-y-2 text-[13.5px]">
            <Row label="Buyer pays" value={money(price)} />
            <Row
              label={`${BRAND.name} fee (${BRAND.feePercent}%)`}
              value={`− ${money(fee)}`}
            />
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <span>You receive</span>
              <span className="display text-[28px] text-trust">{money(price - fee)}</span>
            </div>
          </div>
          <p className="spec text-muted">
            Paid out after the buyer confirms delivery, usually 1–2 business days
            later.
          </p>
        </aside>
      </div>

    </div>
  );
}

/** Numbered section card for the listing form. */
function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="panel p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-trust-soft text-[14px] font-bold text-trust">{n}</span>
        <div>
          <h2 className="text-[17px] font-bold leading-tight">{title}</h2>
          <p className="mt-0.5 text-[13px] text-muted">{hint}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3.5 transition ${
        on ? "border-trust bg-trust/5" : "border-line"
      }`}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-trust)]"
      />
      <span>
        <span className="block text-[13.5px] font-semibold">{label}</span>
        <span className="spec mt-0.5 block text-muted">{hint}</span>
      </span>
    </label>
  );
}
