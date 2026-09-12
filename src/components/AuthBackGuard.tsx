"use client";

import { useEffect } from "react";

export default function AuthBackGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      /*
       * The browser restored this page from its
       * back/forward cache.
       *
       * Force a real request so the server checks
       * whether the session still exists.
       */
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return null;
}
