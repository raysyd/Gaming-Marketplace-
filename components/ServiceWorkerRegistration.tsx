"use client";

import { useEffect } from "react";

/** Mounted once in the root layout — registers public/sw.js. Fails
 * silently (older browsers, privacy-hardened ones that block SW
 * registration) since nothing else on the site depends on it being active.
 *
 * Production only. public/sw.js serves /_next/static/* cache-first, which
 * is safe for production's content-hashed filenames but not for `next dev`,
 * whose chunk names stay the same between edits: a registered worker kept
 * serving the old CSS and JS, so changes never showed up. In development
 * any worker left over from an earlier visit is removed with its cache. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => ("caches" in window ? caches.keys() : []))
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
