"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WarningIcon } from "@/components/icons";

type EmergencyHelpButtonProps = {
  initialCount?: number;
};

export default function EmergencyHelpButton({ initialCount = 0 }: EmergencyHelpButtonProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // Primary source: tiny live count endpoint.
        const countResponse = await fetch("/api/emergencies/count?live=" + Date.now(), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const countData = await countResponse.json().catch(() => null);

        if (!cancelled && countResponse.ok && countData?.success && typeof countData.count === "number") {
          setCount(Math.max(0, countData.count));
          return;
        }

        // Fallback: use the exact feed that Nearby uses.
        // This makes the Discover badge independent of the map page.
        const feedResponse = await fetch("/api/emergencies?live=" + Date.now(), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const feedData = await feedResponse.json().catch(() => null);

        if (!cancelled && feedResponse.ok && feedData?.success && Array.isArray(feedData.emergencies)) {
          setCount(feedData.emergencies.length);
        }
      } catch {
        // Keep the last known value during a temporary network failure.
      }
    };

    void check();
    const timer = window.setInterval(check, 2000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
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
          ? "border-red-500/45 bg-red-500/12 text-red-100 shadow-[0_0_24px_rgba(239,68,68,.12)]"
          : "border-white/[0.08] bg-white/[0.025] text-white/50 hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-white"
      }`}
    >
      <span className={`relative flex h-4 w-4 items-center justify-center ${hasEmergency ? "text-red-300" : "text-red-300/80"}`}>
        <WarningIcon className="h-4 w-4" />
        {hasEmergency && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white shadow-lg shadow-red-950/50">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>

      <span className="truncate">{hasEmergency ? "Emergency Help" : "Emergency help"}</span>

      {hasEmergency && (
        <span className="rounded-full bg-red-500 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white shadow-[0_0_16px_rgba(239,68,68,.35)]">
          {count} Live
        </span>
      )}
    </Link>
  );
}
