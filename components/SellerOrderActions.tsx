"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SellerOrderActions({
  id,
  showDeliver = false,
}: {
  id: string;
  /** Shows "Mark delivered" — the manual AusPost fallback (see lib/shipping/auspost.ts). */
  showDeliver?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const post = async (path: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}/${path}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That didn't work.");
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
    <div className="flex shrink-0 items-start gap-1.5 text-right">
      {showDeliver && (
        <button
          type="button"
          onClick={() => post("deliver", "Mark this order delivered? This starts the buyer's confirmation window.")}
          disabled={busy}
          className="spec rounded border border-trust px-2.5 py-1.5 font-medium text-trust transition hover:bg-trust-soft disabled:opacity-50"
        >
          Mark delivered
        </button>
      )}
      <div>
        <button
          type="button"
          onClick={() => post("refund", "Refund this buyer and cancel the sale?")}
          disabled={busy}
          className="spec rounded border border-line px-2.5 py-1.5 text-muted transition hover:border-deal hover:text-deal disabled:opacity-50"
        >
          {busy ? "Working…" : "Refund"}
        </button>
        {error && <p className="spec mt-1 text-deal">{error}</p>}
      </div>
    </div>
  );
}
