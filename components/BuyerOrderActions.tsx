"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BuyerOrderActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");

  const release = async () => {
    if (
      !window.confirm(
        "Release payment to the seller? Only do this once the item has actually arrived."
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't release payment.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  };

  const submitDispute = async () => {
    if (!reason.trim()) {
      setError("Describe the problem first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit that.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  };

  if (reporting)
    return (
      <div className="w-full max-w-sm rounded-md border border-line bg-paper p-3">
        <label htmlFor={`dispute-${id}`} className="eyebrow">
          What&apos;s wrong?
        </label>
        <textarea
          id={`dispute-${id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Item doesn't match the listing, arrived damaged, etc."
          className="input mt-1.5 w-full resize-y text-[13px]"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={submitDispute}
            disabled={busy}
            className="rounded bg-deal px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Report problem"}
          </button>
          <button
            type="button"
            onClick={() => setReporting(false)}
            className="rounded border border-line px-3 py-2 text-[13px] font-medium"
          >
            Cancel
          </button>
        </div>
        {error && <p className="spec mt-2 text-deal">{error}</p>}
        <p className="spec mt-2 text-muted">
          Payment stays held while this is reviewed — it won&apos;t release automatically.
        </p>
      </div>
    );

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setReporting(true)}
          disabled={busy}
          className="spec rounded border border-line px-2.5 py-1.5 text-muted transition hover:border-deal hover:text-deal disabled:opacity-50"
        >
          Report a problem
        </button>
        <button
          type="button"
          onClick={release}
          disabled={busy}
          className="rgb-ring rounded-md bg-good px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Releasing…" : "Confirm delivery & release"}
        </button>
      </div>
      {error && <p className="spec text-deal">{error}</p>}
    </div>
  );
}
