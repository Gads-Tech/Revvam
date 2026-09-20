"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WarningIcon } from "@/components/icons";

export default function EmergencyGlobalAlert() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const previousCount = useRef(0);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const response = await fetch("/api/emergencies/help?_=" + Date.now(), {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        });
        const data = await response.json().catch(() => null);
        if (!active || !response.ok || typeof data?.count !== "number") return;

        const next = Math.max(0, data.count);
        setCount(next);

        // Pop the alert when a new emergency appears.
        if (next > previousCount.current) {
          setVisible(true);
          window.setTimeout(() => {
            if (active) setVisible(false);
          }, 9000);
        } else if (next === 0) {
          setVisible(false);
        }

        previousCount.current = next;
      } catch {
        // Keep the last known state if the network briefly fails.
      }
    };

    check();
    const timer = window.setInterval(check, 2500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (count < 1) return null;

  return (
    <>
      <Link
        href="/emergency/nearby"
        aria-label={`Open ${count} active emergency help request${count === 1 ? "" : "s"}`}
        className={`fixed left-1/2 top-[max(10px,env(safe-area-inset-top))] z-[2147483640] w-[min(92vw,430px)] -translate-x-1/2 rounded-2xl border border-red-500/35 bg-[#120303]/95 px-4 py-3 text-white shadow-[0_14px_50px_rgba(0,0,0,.75),0_0_35px_rgba(239,68,68,.16)] backdrop-blur-xl transition-all duration-300 md:top-4 ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-95"}`}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
            <span className="absolute inset-0 animate-ping rounded-xl bg-red-500/10" />
            <WarningIcon className="relative h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-red-400">Emergency Help</span>
            <span className="mt-0.5 block truncate text-sm font-bold">
              {count} active {count === 1 ? "roadside request" : "roadside requests"}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-red-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">
            View
          </span>
        </div>
      </Link>
    </>
  );
}
