"use client";

import { useEffect } from "react";

/**
 * Registers the offline service worker on the client, after load. The SW only
 * activates on a real HTTPS origin (or localhost during `next dev`), so this is
 * a no-op in sandboxed previews.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* offline support is progressive enhancement — ignore failures */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
