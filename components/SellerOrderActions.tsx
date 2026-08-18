"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SellerOrderActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refund = async () => {
    if (!window.confirm("Refund this buyer and cancel the sale?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}/refund`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Refund failed.");
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
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={refund}
        disabled={busy}
        className="spec rounded border border-line px-2.5 py-1.5 text-muted transition hover:border-deal hover:text-deal disabled:opacity-50"
      >
        {busy ? "Refunding…" : "Refund"}
      </button>
      {error && <p className="spec mt-1 text-deal">{error}</p>}
    </div>
  );
}
