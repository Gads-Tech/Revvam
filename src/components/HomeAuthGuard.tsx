"use client";

import { useEffect } from "react";

export default function HomeAuthGuard() {
  useEffect(() => {
    /*
     * Prevent authenticated pages from being restored
     * from the browser's back/forward cache.
     *
     * This is important after logout because otherwise
     * the browser can display the old /home document
     * without requesting it from Next.js again.
     */
    const preventBackForwardCache = () => {
      // Intentionally empty.
      // Registering beforeunload makes browsers treat
      // this document as non-bfcache eligible.
    };

    window.addEventListener("beforeunload", preventBackForwardCache);

    /*
     * Only reload when the browser actually restored the
     * document from bfcache. A normal page load/reload must
     * never trigger another reload from this handler.
     *
     * The previous implementation reloaded on every
     * pageshow event, which could create reload loops and
     * unnecessary document requests.
     */
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("beforeunload", preventBackForwardCache);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
