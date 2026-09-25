"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

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
    return <p className="spec font-semibold text-good">Saved — we'll email you about new matches.</p>;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="spec rounded-lg border border-trust px-2.5 py-1.5 font-medium text-trust transition hover:bg-trust-soft"
      >
        Save this search
      </button>
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value.slice(0, 80))}
        className="input max-w-[220px]"
        placeholder="e.g. RTX 3080 under $600"
      />
      <button
        type="button"
        onClick={save}
        disabled={state === "saving"}
        className="spec rounded-lg bg-ink px-3 py-1.5 font-semibold text-white disabled:opacity-50"
      >
        {state === "saving" ? "Saving…" : "Save"}
      </button>
      {error && <p className="spec text-deal">{error}</p>}
    </div>
  );
}
