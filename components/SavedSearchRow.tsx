"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./ui/Icon";
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
    <li className="card-lift flex items-center justify-between gap-3 panel p-4">
      <Link href={href} className="inline-flex items-center gap-2.5 text-[14.5px] font-semibold transition hover:text-deal">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-trust-soft text-trust"><Icon name="bell" size={16} /></span>
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
