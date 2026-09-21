"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OnlineUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  role: string;
};

export default function OnlineMembers() {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const response = await fetch("/api/presence/online?_=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) setUsers(Array.isArray(data.users) ? data.users : []);
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="mb-5 overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">Live community</p>
            <h2 className="mt-0.5 text-sm font-bold">Who&apos;s online</h2>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-white/25">{users.length} online</span>
      </div>

      <div className="flex gap-2 overflow-x-auto p-3 [scrollbar-width:none]">
        {loading && users.length === 0 ? (
          <div className="px-2 py-2 text-xs text-white/25">Checking who&apos;s online...</div>
        ) : users.length === 0 ? (
          <div className="px-2 py-2 text-xs text-white/25">No other members are online right now.</div>
        ) : (
          users.map((user) => (
            <Link key={user.id} href={"/users/" + encodeURIComponent(user.username)} className="flex min-w-[78px] flex-col items-center rounded-2xl px-2 py-2 transition hover:bg-white/[0.04]">
              <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-emerald-400/25 bg-red-500/10 text-sm font-bold text-red-300">
                {user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
                <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#090909] bg-emerald-400" />
              </span>
              <span className="mt-2 max-w-[72px] truncate text-[10px] font-semibold text-white/65">{user.name}</span>
              <span className="max-w-[72px] truncate text-[8px] text-white/20">@{user.username}</span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
