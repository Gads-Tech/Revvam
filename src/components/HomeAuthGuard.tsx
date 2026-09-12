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

    window.addEventListener(
      "beforeunload",
      preventBackForwardCache
    );

    /*
     * Additional protection for browsers that still
     * restore the page from bfcache.
     */
    const handlePageShow = () => {
      window.location.reload();
    };

    window.addEventListener(
      "pageshow",
      handlePageShow
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        preventBackForwardCache
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow
      );
    };
  }, []);

  return null;
}
