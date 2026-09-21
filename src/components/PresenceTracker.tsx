"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000;

export default function PresenceTracker() {
  useEffect(() => {
    let active = true;
    let authenticated = false;

    async function heartbeat() {
      if (!active || !authenticated || document.visibilityState !== "visible") return;

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

    async function start() {
      try {
        const response = await fetch("/api/profile?_presence=1", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        });

        if (!response.ok || !active) return;
        const data = await response.json().catch(() => null);
        if (!data?.success) return;

        authenticated = true;
        await heartbeat();
      } catch {}
    }

    void start();

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
