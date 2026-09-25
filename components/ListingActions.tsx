"use client";

import Link from "next/link";
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
    <div className="flex items-center gap-2">
    <Link
      href={`/sell?edit=${id}`}
      className="spec rounded-lg border border-trust px-2.5 py-1.5 font-medium text-trust transition hover:bg-trust-soft"
    >
      Edit
    </Link>
    <button
      type="button"
      onClick={takeDown}
      disabled={busy}
      className="spec rounded-lg border border-line px-2.5 py-1.5 text-muted transition hover:border-deal hover:text-deal disabled:opacity-50"
    >
      {busy ? "Taking down..." : "Take down"}
    </button>
    </div>
  );
}