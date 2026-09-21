"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WarningIcon } from "@/components/icons";

export default function EmergencyHelpButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch("/api/emergencies/count?t=" + Date.now(), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = await response.json().catch(() => null);

        if (!cancelled && response.ok && data?.success && typeof data.count === "number") {
          setCount(Math.max(0, data.count));
        }
      } catch {
        // Keep the last known emergency count during temporary network failures.
      }
    };

    void refresh();

    // Emergency Help is intentionally a lightweight live alert, not a normal notification.
    const interval = window.setInterval(refresh, 2000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const active = count > 0;

  return (
    <Link
      href="/emergency"
      aria-label={active ? `Emergency Help: ${count} active emergency${count === 1 ? "" : "ies"}` : "Emergency Help"}
      className={`relative flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-[10px] font-bold transition sm:text-xs ${
        active
          ? "border-red-500/50 bg-red-500/12 text-white shadow-[0_0_24px_rgba(239,68,68,.18)]"
          : "border-white/[0.08] bg-white/[0.025] text-white/50 hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white"
      }`}
    >
      <span className={`relative flex h-4 w-4 items-center justify-center ${active ? "text-red-300" : "text-red-300/80"}`}>
        <WarningIcon className="h-4 w-4" />
        {active && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white shadow-[0_0_14px_rgba(239,68,68,.45)]">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>

      <span className="truncate">Emergency Help</span>

      {active && (
        <span className="rounded-full bg-red-500 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white">
          {count} Live
        </span>
      )}
    </Link>
  );
}
