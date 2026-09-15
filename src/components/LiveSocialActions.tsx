"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = { compact?: boolean };

function updateStaticBadges(notifications: number, messages: number) {
  if (typeof document === "undefined") return;

  const targets = [
    { selector: 'a[href="/profile/notifications"]', label: "Notifications", count: notifications },
    { selector: 'a[href="/messages"]', label: "Messages", count: messages },
  ];

  for (const { selector, label, count } of targets) {
    document.querySelectorAll<HTMLAnchorElement>(selector).forEach((link) => {
      if (link.closest(".mobile-nav-root")) return;

      link.setAttribute("aria-label", label);
      link.className = "relative inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 text-sm font-semibold text-white/65 shadow-lg transition hover:border-red-400/25 hover:bg-red-500/[0.08] hover:text-white";

      let labelNode = link.querySelector<HTMLElement>("[data-revvam-social-label]");
      if (!labelNode) {
        labelNode = document.createElement("span");
        labelNode.dataset.revvamSocialLabel = "true";
        link.prepend(labelNode);
      }
      labelNode.textContent = label;

      let badge = link.querySelector<HTMLElement>("[data-revvam-unread-badge]");
      if (!badge) {
        badge = document.createElement("span");
        badge.dataset.revvamUnreadBadge = "true";
        badge.className = "inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-black bg-red-500 px-2 text-[13px] font-black leading-none text-white shadow-[0_2px_10px_rgba(239,68,68,0.45)]";
        link.appendChild(badge);
      }

      badge.textContent = count > 99 ? "99+" : String(count);
      badge.style.display = count > 0 ? "inline-flex" : "none";
      badge.style.visibility = count > 0 ? "visible" : "hidden";
    });
  }

  document.querySelectorAll<HTMLElement>("[data-revvam-mobile-social]").forEach((link) => {
    const type = link.dataset.revvamMobileSocial;
    const count = type === "notifications" ? notifications : messages;
    let badge = link.querySelector<HTMLElement>("[data-revvam-unread-badge]");
    if (!badge) {
      badge = document.createElement("span");
      badge.dataset.revvamUnreadBadge = "true";
      badge.className = "absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-black bg-red-500 px-1.5 text-[11px] font-black leading-none text-white shadow-[0_2px_10px_rgba(239,68,68,0.45)]";
      link.appendChild(badge);
    }
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = count > 0 ? "flex" : "none";
    badge.style.visibility = count > 0 ? "visible" : "hidden";
  });
}

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
        const nextNotifications = data.unreadNotifications ?? 0;
        const nextMessages = data.unreadMessages ?? 0;
        setNotifications(nextNotifications);
        setMessages(nextMessages);
        updateStaticBadges(nextNotifications, nextMessages);
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
