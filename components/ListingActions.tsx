"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ListingActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!active) return <span className="spec text-muted">Taken down</span>;

  const takeDown = async () => {
    if (!window.confirm("Take this listing down? Buyers will no longer see it.")) return;
    setBusy(true);
    const response = await fetch("/api/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "inactive" }),
    });
    if (response.ok) router.refresh();
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={takeDown}
      disabled={busy}
      className="btn btn-outline btn-sm"
    >
      {busy ? "Taking down..." : "Take down"}
    </button>
  );
}