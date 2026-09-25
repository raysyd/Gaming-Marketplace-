"use client";
import { useEffect, useState } from "react";

const KEY = "sidegrade.dismissedDemoBanner";

/** Shown only when the page fell back to generated sample listings — see ListingPage.isDemo in lib/data.ts. */
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(true); // hidden until localStorage says otherwise, avoids a flash

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-[10px] border border-dashed border-line-strong bg-card px-4 py-2.5">
      <p className="flex items-center gap-2.5 text-[13px] text-ink-soft">
        <span className="tag-label shrink-0 rounded bg-ink px-1.5 py-0.5 text-paper">Preview</span>
        Sample listings — not real inventory.
      </p>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            window.sessionStorage.setItem(KEY, "1");
          } catch {}
        }}
        aria-label="Dismiss"
        className="inline-link shrink-0 text-[13px]"
      >
        Dismiss
      </button>
    </div>
  );
}
