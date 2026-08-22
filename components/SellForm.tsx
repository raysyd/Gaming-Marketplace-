"use client";
import { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import { PhotoUploader } from "@/components/PhotoUploader";
import { TAXONOMY, findTop, findSub, slugify } from "@/lib/taxonomy";
import { SUGGESTED_SPECS } from "@/lib/specs";
import { attributesFor } from "@/lib/attributes";
import { ConnectPayoutButton } from "@/components/ConnectPayoutButton";
import { ListingUsageBar } from "@/components/ListingUsageBar";

const CONDITIONS = ["New", "Like new", "Used", "For parts"];
const DEFAULT_TOP = "pc-parts-and-components";
const DEFAULT_SUB = "graphics-cards";
const MIN_PHOTOS = 5;

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
}: {
  payoutsReady: boolean;
  payoutStatus?: "none" | "pending" | "active" | "unknown";
  maxPhotos?: number;
  listingLimit?: number;
  activeListingCount?: number;
  premium?: boolean;
}) {
  const atListingLimit = activeListingCount >= listingLimit;
  const [form, setForm] = useState({
    title: "",
    categorySlug: DEFAULT_TOP,
    subcategorySlug: DEFAULT_SUB,
    condition: "Used",
    price: "",
    quantity: "1",
    location: "",
    description: "",
    shipsFree: true,
    acceptsOffers: true,
  });
  const [specs, setSpecs] = useState([{ label: "", value: "" }]);
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setErrorMsg] = useState("");
  const [listingId, setListingId] = useState("");
  const [upgradeBusy, setUpgradeBusy] = useState(false);

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
      const attrSpecs = subAttrs
        .filter((a) => attrs[a.key]?.trim())
        .map((a) => ({ label: a.label, value: attrs[a.key].trim() }));
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          category: findSub(form.subcategorySlug)?.name ?? "",
          price,
          quantity,
          specs: [...attrSpecs, ...specs.filter((s) => s.label && s.value)],
          image: photos[0] ?? "",
          images: photos.slice(1),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setListingId(data.id ?? "");
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
        <h1 className="display mt-2 text-[30px]">{form.title} is on the market.</h1>
        <p className="mt-3 text-[14px] text-muted">
          Buyers can message you from the listing. You&apos;ll get{" "}
          {money(price - fee)} once delivery is confirmed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/selling"
            className="rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            View your listings
          </Link>
          {listingId && (
            <Link
              href={`/product/${listingId}/${slugify(form.title)}`}
              className="rounded-md border border-line px-5 py-2.5 text-[13px] font-semibold"
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
    <div className="mx-auto max-w-[1240px] px-4 py-10">
      <p className="eyebrow">Sell</p>
      <h1 className="display mt-2 text-[32px]">List an item</h1>
      <p className="mt-2 max-w-lg text-[14px] text-muted">
        Listing is free. {BRAND.name} takes {BRAND.feePercent}% only when the item
        sells and the buyer confirms delivery.
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
              className="mt-3 rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {upgradeBusy ? "Loading…" : "Upgrade to Premium Seller"}
            </button>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-[10px] border border-line bg-card p-6">
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

          <div className="grid gap-4 sm:grid-cols-3">
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
                placeholder="Adelaide, SA"
                className="input"
              />
            </Field>
          </div>

          <Field label={`Photos — ${photos.length} of ${MIN_PHOTOS} minimum (up to ${maxPhotos})`}>
            <PhotoUploader photos={photos} onChange={setPhotos} min={MIN_PHOTOS} max={maxPhotos} />
          </Field>

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
                    className="spec rounded border border-trust px-2.5 py-1.5 font-medium text-trust"
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
          </div>

          {state === "error" && <p className="spec text-deal">{error}</p>}

          <button
            onClick={submit}
            disabled={
              state === "saving" ||
              photos.length < MIN_PHOTOS ||
              !!missingAttr ||
              !payoutsReady ||
              atListingLimit
            }
            className="rgb-ring w-full rounded-md bg-deal py-3 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
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

        <aside className="h-fit space-y-4 rounded-[10px] border border-line bg-card p-5">
          <h2 className="eyebrow">What you take home</h2>
          <div className="space-y-2 text-[13.5px]">
            <Row label="Buyer pays" value={money(price)} />
            <Row
              label={`${BRAND.name} fee (${BRAND.feePercent}%)`}
              value={`− ${money(fee)}`}
            />
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <span>You receive</span>
              <span className="display text-[18px]">{money(price - fee)}</span>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
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
