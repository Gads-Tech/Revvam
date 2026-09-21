"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000;

export default function PresenceTracker() {
  useEffect(() => {
    let active = true;

    async function heartbeat() {
      if (!active || document.visibilityState !== "visible") return;

      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
          keepalive: true,
        });
      } catch {}
    }

    void heartbeat();

    const interval = window.setInterval(() => {
      void heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void heartbeat();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
