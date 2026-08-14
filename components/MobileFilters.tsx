"use client";
import { useEffect, useState } from "react";

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
        className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-card py-2.5 text-[13px] font-semibold"
      >
        Filters
        {activeCount > 0 && (
          <span className="spec rounded-full bg-deal px-1.5 py-0.5 font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50"
          />
          <div className="relative max-h-[85vh] overflow-y-auto rounded-t-2xl bg-paper p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="display text-[20px]">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded border border-line px-3 py-1.5 text-[13px]"
              >
                Done
              </button>
            </div>
            <div onClick={() => setOpen(false)}>{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
