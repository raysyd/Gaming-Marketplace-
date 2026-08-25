"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function SavedSearchRow({ id, label, href }: { id: string; label: string; href: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    const res = await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    setBusy(false);
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-[10px] border border-line bg-card p-4">
      <Link href={href} className="text-[14px] font-semibold hover:text-trust">
        {label}
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="spec rounded border border-line px-2.5 py-1.5 text-muted transition hover:border-deal hover:text-deal disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
    </li>
  );
}
