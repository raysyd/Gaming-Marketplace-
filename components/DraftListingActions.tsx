"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Mirrors ListingActions.tsx's pattern, for the "drafts" tab in
 * app/selling/page.tsx instead of a published listing. */
export function DraftListingActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const discard = async () => {
    if (!window.confirm("Discard this draft? This can't be undone.")) return;
    setBusy(true);
    const response = await fetch(`/api/listings?id=${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/sell?draft=${id}`}
        className="spec rounded-lg border border-trust px-2.5 py-1.5 font-medium text-trust transition hover:bg-trust-soft"
      >
        Continue editing
      </Link>
      <button
        type="button"
        onClick={discard}
        disabled={busy}
        className="spec rounded-lg border border-line px-2.5 py-1.5 text-muted transition hover:border-deal hover:text-deal disabled:opacity-50"
      >
        {busy ? "Discarding…" : "Discard"}
      </button>
    </div>
  );
}
