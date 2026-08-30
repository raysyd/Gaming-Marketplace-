"use client";

import { useEffect } from "react";

/** Mounted once in the root layout — registers public/sw.js. Fails
 * silently (older browsers, privacy-hardened ones that block SW
 * registration, or plain dev-mode noise) since nothing else on the site
 * depends on it being active. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
