"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShipOrderForm({ id }: { id: string }) {
  const router = useRouter();
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!tracking.trim()) {
      setError("Enter the Australia Post tracking number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: tracking }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save tracking.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking number"
          className="input w-[160px] text-[13px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rgb-ring shrink-0 rounded-md bg-ink px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Mark posted"}
        </button>
      </div>
      {error && <p className="spec text-deal">{error}</p>}
    </div>
  );
}
