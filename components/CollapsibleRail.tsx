"use client";

import { useEffect, useState } from "react";

const KEY = "sidegrade.rail";

/**
 * Desktop shop layout: the sticky filter rail beside the results, with a
 * control to fold the rail away and give the grid the full width. The
 * choice is remembered per browser. Phones use MobileFilters instead.
 */
export function CollapsibleRail({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(KEY) === "collapsed");
    } catch {
      // Storage blocked: start expanded.
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(KEY, next ? "collapsed" : "open");
    } catch {
      // Not remembered this time; the toggle still works.
    }
  };

  return (
    <div className={`shop-layout ${collapsed ? "is-collapsed" : ""}`}>
      <div className="shop-rail hidden lg:block">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="shop-filter-rail"
          className="rail-toggle"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <span>{collapsed ? "Filters" : "Hide filters"}</span>
        </button>
        {/* Rendered straight into the column (no wrapper) so the rail's
            position: sticky spans the whole results height, and SiteHeader
            can measure the column as the rail's parent. */}
        {rail}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
