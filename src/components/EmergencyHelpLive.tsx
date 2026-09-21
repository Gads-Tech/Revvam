"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EmergencyHelpLive({ initialCount, enabled }: { initialCount: number; enabled: boolean }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/emergencies/help", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const data = await response.json();
        if (active && typeof data?.count === "number") setCount(data.count);
      } catch {}
    };
    check();
    const timer = window.setInterval(check, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [enabled]);

  if (!enabled || count < 1) return null;

  return (
    <Link href="/emergency/nearby" className="mb-6 hidden items-center justify-between rounded-[1.35rem] md:flex border border-red-500/25 bg-gradient-to-r from-red-950/40 via-red-500/[0.08] to-transparent px-4 py-3.5 transition hover:border-red-400/40 hover:bg-red-500/[0.10]">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400/75">Emergency Help</p>
        <p className="mt-0.5 text-sm font-bold text-white">{count} active {count === 1 ? "request" : "requests"}</p>
      </div>
      <span className="rounded-full bg-red-500 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-white">Emergency Help {count}</span>
    </Link>
  );
}
