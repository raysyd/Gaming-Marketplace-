"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BuyerOrderActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={release}
        disabled={busy}
        className="rgb-ring rounded-md bg-good px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Releasing…" : "Confirm delivery & release"}
      </button>
      {error && <p className="spec mt-1 text-deal">{error}</p>}
    </div>
  );
}
