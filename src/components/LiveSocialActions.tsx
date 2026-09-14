"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = { compact?: boolean };

export default function LiveSocialActions({ compact = false }: Props) {
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);

  async function refresh() {
    try {
      const response = await fetch("/api/social/unread", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.success) {
        setNotifications(data.unreadNotifications ?? 0);
        setMessages(data.unreadMessages ?? 0);
      }
    } catch {
      // Keep the last known counts while offline.
    }
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 2500);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const size = compact ? "h-10 w-10" : "h-10 w-10";

  return (
    <div className="flex items-center gap-2">
      <Link href="/profile/notifications" aria-label="Notifications" className={`relative flex ${size} items-center justify-center rounded-full border border-white/[0.08] bg-black/70 text-lg text-white/60 shadow-lg backdrop-blur-xl transition hover:border-red-400/25 hover:bg-red-500/[0.08] hover:text-white`}>
        <span aria-hidden>♢</span>
        {notifications > 0 && <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-black bg-red-500 px-1 text-[9px] font-black text-white">{notifications > 99 ? "99+" : notifications}</span>}
      </Link>
      <Link href="/messages" aria-label="Messages" className={`relative flex ${size} items-center justify-center rounded-full border border-white/[0.08] bg-black/70 text-lg text-white/60 shadow-lg backdrop-blur-xl transition hover:border-red-400/25 hover:bg-red-500/[0.08] hover:text-white`}>
        <span aria-hidden>✉</span>
        {messages > 0 && <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-black bg-red-500 px-1 text-[9px] font-black text-white">{messages > 99 ? "99+" : messages}</span>}
      </Link>
    </div>
  );
}
