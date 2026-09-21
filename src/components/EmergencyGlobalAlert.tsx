"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { WarningIcon } from "@/components/icons";

type AlertData = {
  count: number;
  latest: {
    id: string;
    type: string;
    description: string;
    locationLabel: string | null;
    ghostMode: boolean;
    radiusMeters: number;
  } | null;
};

export default function EmergencyGlobalAlert() {
  const [data, setData] = useState<AlertData>({ count: 0, latest: null });
  const [showPulse, setShowPulse] = useState(false);
  const [visible, setVisible] = useState(false);
  const lastLatestId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const check = async () => {
      try {
        const response = await fetch("/api/emergencies?_=" + Date.now(), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, max-age=0",
          },
        });

        const json = await response.json().catch(() => null);
        if (!active || !response.ok || !json?.success || !Array.isArray(json.emergencies)) return;

        const emergencies = json.emergencies;
        const latest = emergencies[0] ?? null;
        const next: AlertData = {
          count: emergencies.length,
          latest: latest
            ? {
                id: latest.id,
                createdAt: latest.createdAt,
                type: latest.type,
                description: latest.description,
                locationLabel: latest.locationLabel,
                ghostMode: latest.ghostMode,
                radiusMeters: latest.radiusMeters,
              }
            : null,
        };

        if (next.latest?.id && next.latest.id !== lastLatestId.current) {
          setShowPulse(true);
          setVisible(true);
          window.setTimeout(() => {
            if (active) setShowPulse(false);
          }, 8000);
          window.setTimeout(() => {
            if (active) setVisible(false);
          }, 4000);
        }

        lastLatestId.current = next.latest?.id ?? null;
        setData(next);
      } catch {
        // A temporary network failure must not make the existing alert disappear.
      }
    };

    void check();
    timer = window.setInterval(() => void check(), 2500);

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (data.count < 1 || !visible) return null;

  const latestText = data.latest
    ? data.latest.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter: string) => letter.toUpperCase())
    : "Roadside assistance";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[2147483640] hidden justify-center md:flex px-3 pt-[max(10px,env(safe-area-inset-top))] md:pt-4"
      role="status"
      aria-live="polite"
    >
      <Link
        href={data.latest?.id ? `/map?emergency=${encodeURIComponent(data.latest.id)}` : "/map"}
        className={`pointer-events-auto flex w-full max-w-[520px] items-center gap-3 rounded-2xl border border-red-500/40 bg-[#110303]/[0.98] px-4 py-3 text-white shadow-[0_18px_60px_rgba(0,0,0,.85),0_0_45px_rgba(239,68,68,.18)] backdrop-blur-2xl transition-all hover:border-red-400/60 hover:bg-[#180404] ${showPulse ? "ring-2 ring-red-500/25" : ""}`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/15 text-red-300">
          <span className="absolute inset-0 animate-ping rounded-xl bg-red-500/10" />
          <WarningIcon className="relative h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-red-400">
            Emergency Help
          </span>
          <span className="mt-0.5 block truncate text-sm font-bold">
            {data.count} active {data.count === 1 ? "request" : "requests"} · {latestText}
          </span>
          {data.latest?.description && (
            <span className="mt-0.5 block truncate text-[10px] text-white/35">
              {data.latest.description}
            </span>
          )}
        </span>

        <span className="shrink-0 rounded-full bg-red-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">
          View
        </span>
      </Link>
    </div>
  );
}
