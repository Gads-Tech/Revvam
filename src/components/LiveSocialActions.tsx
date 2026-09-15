"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = { compact?: boolean };

export default function LiveSocialActions({ compact = false }: Props) {
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState(0);

  async function refresh() {
    try {
      const response = await fetch(`/api/social/unread?_=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
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
    const timer = window.setInterval(refresh, 1500);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (compact) return null;

  return (
    <div className="flex items-center gap-2">
      <Link href="/profile/notifications" aria-label="Notifications" className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-black/70 px-4 text-sm font-semibold text-white/70 shadow-lg backdrop-blur-xl transition hover:border-red-400/25 hover:bg-red-500/[0.08] hover:text-white">
        Notifications
        {notifications > 0 && <span data-revvam-unread-badge className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-black bg-red-500 px-2 text-[13px] font-black leading-none text-white shadow-[0_2px_10px_rgba(239,68,68,0.45)]">{notifications > 99 ? "99+" : notifications}</span>}
      </Link>
      <Link href="/messages" aria-label="Messages" className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-black/70 px-4 text-sm font-semibold text-white/70 shadow-lg backdrop-blur-xl transition hover:border-red-400/25 hover:bg-red-500/[0.08] hover:text-white">
        Messages
        {messages > 0 && <span data-revvam-unread-badge className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-black bg-red-500 px-2 text-[13px] font-black leading-none text-white shadow-[0_2px_10px_rgba(239,68,68,0.45)]">{messages > 99 ? "99+" : messages}</span>}
      </Link>
    </div>
  );
}
