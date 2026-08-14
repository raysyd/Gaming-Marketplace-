"use client";
import { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import { PhotoUploader } from "@/components/PhotoUploader";

const CATEGORIES = [
  "Prebuilt PCs",
  "Graphics Cards",
  "Processors",
  "Laptops",
  "Monitors",
  "Peripherals",
  "Consoles",
];
const CONDITIONS = ["New", "Like new", "Used", "For parts"];

export default function SellPage() {
  const [form, setForm] = useState({
    title: "",
    category: "Graphics Cards",
    condition: "Used",
    price: "",
    location: "",
    description: "",
    shipsFree: true,
    acceptsOffers: true,
  });
  const [specs, setSpecs] = useState([{ label: "", value: "" }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const price = Number(form.price) || 0;
  const fee = Math.round((price * BRAND.feePercent) / 100);

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim() || !price) {
      setState("error");
      return;
    }
    setState("saving");
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price,
          specs: specs.filter((s) => s.label && s.value),
          image: photos[0] ?? "",
          images: photos.slice(1),
        }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
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
            href="/dashboard"
            className="rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            View your listings
          </Link>
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
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Condition">
              <select
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                className="input"
              >
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Asking price (${BRAND.currency})`}>
              <input
                value={form.price}
                onChange={(e) => set("price", e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="1990"
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

          <Field label="Photos">
            <PhotoUploader photos={photos} onChange={setPhotos} />
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
              <button
                onClick={() => setSpecs((p) => [...p, { label: "", value: "" }])}
                className="spec rounded border border-line px-2.5 py-1.5 font-medium"
              >
                + Add spec
              </button>
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

          <div className="flex flex-wrap gap-5">
            <Toggle
              label="Free shipping"
              on={form.shipsFree}
              onChange={() => set("shipsFree", !form.shipsFree)}
            />
            <Toggle
              label="Accept offers"
              on={form.acceptsOffers}
              onChange={() => set("acceptsOffers", !form.acceptsOffers)}
            />
          </div>

          {state === "error" && (
            <p className="spec text-deal">
              Add a title and a price above zero, then try again.
            </p>
          )}

          <button
            onClick={submit}
            disabled={state === "saving"}
            className="w-full rounded-md bg-deal py-3 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {state === "saving" ? "Publishing…" : "Publish listing"}
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
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13.5px]">
      <input
        type="checkbox"
        checked={on}
        onChange={onChange}
        className="h-4 w-4 accent-[var(--color-trust)]"
      />
      {label}
    </label>
  );
}
