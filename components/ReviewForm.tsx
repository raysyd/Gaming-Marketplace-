"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewForm({ orderId, listingTitle }: { orderId: string; listingTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit that.");
        setBusy(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  };

  if (done) return <p className="spec font-semibold text-good">Thanks — review posted.</p>;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="spec rounded border border-trust px-2.5 py-1.5 font-medium text-trust transition hover:bg-trust-soft"
      >
        Leave a review
      </button>
    );

  return (
    <div className="w-full max-w-sm rounded-md border border-line bg-paper p-3">
      <p className="eyebrow">Rate {listingTitle}</p>
      <div className="mt-1.5 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={`text-[22px] leading-none ${n <= rating ? "text-deal" : "text-line"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="How was the item and the seller? (optional)"
        className="input mt-2 w-full resize-y text-[13px]"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="btn btn-primary btn-sm"
        >
          {busy ? "Posting…" : "Post review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-line px-3 py-2 text-[13px] font-medium"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-[13px] font-medium text-danger mt-2">{error}</p>}
    </div>
  );
}
