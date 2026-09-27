"use client";

import { useEffect, useState } from "react";

const KEY = "sidegrade.theme";

/**
 * Light is the default (html.light is server-rendered in app/layout.tsx);
 * dark is an opt-in remembered in localStorage. The inline script in the
 * layout applies a saved choice before first paint, so this only mirrors
 * the current class into state and flips both classes on click.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    const c = document.documentElement.classList;
    c.toggle("dark", next);
    c.toggle("light", !next);
    try {
      window.localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
      className="theme-switch"
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-thumb">{dark ? "☾" : "☼"}</span>
      </span>
    </button>
  );
}
