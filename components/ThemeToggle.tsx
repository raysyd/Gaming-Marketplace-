"use client";

import { useEffect, useId, useState } from "react";

const KEY = "sidegrade.theme";

/**
 * Sun/moon toggle. The initial theme is applied before first paint by the
 * inline script in app/layout.tsx; this only reads that state back and
 * flips it. The icon morphs (rays tuck in, a bite is taken out of the
 * disc) via CSS keyed off html.dark, so it's correct even pre-hydration.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const maskId = `moon-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
      className={`theme-switch ${className}`}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
        <mask id={maskId}>
          <rect x="0" y="0" width="24" height="24" fill="#fff" />
          <circle className="moon-cut" cx="24" cy="4" r="7" fill="#000" />
        </mask>
        <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" mask={`url(#${maskId})`} />
        <g className="sun-rays">
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </g>
      </svg>
    </button>
  );
}
