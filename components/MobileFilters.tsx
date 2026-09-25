"use client";
import { useEffect, useState } from "react";
import { Icon } from "./ui/Icon";

/**
 * On phones the filter rail becomes a slide-up sheet. The rail itself is
 * rendered on the server and passed in as children, so there's one source of
 * truth for filters across both layouts.
 */
export function MobileFilters({
  children,
  activeCount,
}: {
  children: React.ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-block"
      >
        <Icon name="filter" size={17} />
        Filters
        {activeCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1.5 text-[11px] font-bold text-signal-ink">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="sheet-backdrop absolute inset-0 bg-[#0a0c0b]/50"
          />
          <div className="sheet-up relative max-h-[85vh] overflow-y-auto rounded-t-[22px] bg-card p-5 pb-10">
            <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="display text-[26px]">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                className="btn btn-dark btn-sm"
              >
                Done
              </button>
            </div>
            {/* Close after picking a filter link, but not when typing in the
                price or search boxes (those submit their own form). */}
            <div onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)} onSubmit={() => setOpen(false)}>{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
