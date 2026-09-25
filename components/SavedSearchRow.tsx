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
    <li className="flex items-center justify-between gap-3 panel p-4">
      <Link href={href} className="text-[14px] font-semibold hover:text-trust">
        {label}
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="btn btn-outline btn-sm"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
    </li>
  );
}
