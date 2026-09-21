"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WarningIcon } from "@/components/icons";

export default function EmergencyHelpButton({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const response = await fetch("/api/emergencies/count?_=" + Date.now(), {
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, max-age=0",
          },
        });

        const data = await response.json().catch(() => null);
        if (active && response.ok && data?.success && typeof data.count === "number") {
          setCount(Math.max(0, data.count));
        }
      } catch {
        // Keep the current count during temporary network failures.
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), 2500);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const hasEmergency = count > 0;

  return (
    <Link
      href="/emergency"
      aria-label={hasEmergency ? `Emergency Help: ${count} active request${count === 1 ? "" : "s"}` : "Post an emergency request"}
      className={`relative flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-[10px] font-bold transition sm:text-xs ${
        hasEmergency
          ? "border-red-500/45 bg-red-500/12 text-red-100 shadow-[0_0_24px_rgba(239,68,68,.12)] hover:border-red-400/60 hover:bg-red-500/15"
          : "border-white/[0.08] bg-white/[0.025] text-white/50 hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white"
      }`}
    >
      <span className={`relative flex h-4 w-4 items-center justify-center ${hasEmergency ? "text-red-300" : "text-red-300/80"}`}>
        <WarningIcon className="h-4 w-4" />
        {hasEmergency && (
          <span className="absolute -right-2 -top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[7px] font-black text-white shadow-lg shadow-red-950/50">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>

      <span className="truncate">
        {hasEmergency ? "Emergency Help" : "Emergency help"}
      </span>

      {hasEmergency && (
        <span className="rounded-full bg-red-500 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white shadow-[0_0_16px_rgba(239,68,68,.35)]">
          {count} Live
        </span>
      )}
    </Link>
  );
}
