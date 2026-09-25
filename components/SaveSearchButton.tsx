"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "./ui/Icon";

/** Saves the current /shop filters so a signed-in buyer gets emailed
 * when a new listing matches — see app/api/cron/price-alerts. */
export function SaveSearchButton({ defaultLabel }: { defaultLabel: string }) {
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(defaultLabel);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const save = async () => {
    setState("saving");
    setError("");
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          query: {
            q: sp.get("q") || undefined,
            category: sp.get("category") || undefined,
            sub: sp.get("sub") || undefined,
            conditions: sp.get("condition")?.split(",").filter(Boolean),
            minPrice: sp.get("min") ? Number(sp.get("min")) : undefined,
            maxPrice: sp.get("max") ? Number(sp.get("max")) : undefined,
            freeShipping: sp.get("free") === "1",
            verifiedOnly: sp.get("verified") === "1",
            dealsOnly: sp.get("deals") === "1",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState("saved");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save that search.");
      setState("error");
    }
  };

  if (state === "saved")
    return (
      <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-good">
        <Icon name="check-circle" size={16} /> Saved — we&apos;ll email you about new matches.
      </p>
    );

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-xs"
      >
        <Icon name="bell" size={14} />
        Alert me to new matches
      </button>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value.slice(0, 80))}
        className="input !min-h-[36px] max-w-[240px] !py-1.5"
        aria-label="Name this saved search"
        placeholder="e.g. RTX 3080 under $600"
      />
      <button
        type="button"
        onClick={save}
        disabled={state === "saving"}
        className="btn btn-dark btn-sm"
      >
        {state === "saving" ? "Saving…" : "Save"}
      </button>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}
