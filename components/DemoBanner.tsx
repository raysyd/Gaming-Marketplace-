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
    <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-trust/40 bg-trust-soft px-4 py-2.5">
      <p className="spec text-trust">
        Preview — sample listings, not real inventory.
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
        className="spec shrink-0 text-trust hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
