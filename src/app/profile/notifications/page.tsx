"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

type Actor = { id: string; name: string; username: string; image: string | null };
type Notification = {
  id: string;
  type: "FOLLOW" | "MESSAGE";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  actor: Actor;
  isFollowingActor: boolean;
};

export default function ProfileNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [followedBack, setFollowedBack] = useState<Record<string, boolean>>({});

  async function load() {
    try {
      const response = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load notifications.");
      setNotifications(data.notifications ?? []);
      const initial: Record<string, boolean> = {};
      for (const item of data.notifications ?? []) {
        if (item.type === "FOLLOW") initial[item.actor.id] = Boolean(item.isFollowingActor);
      }
      setFollowedBack(initial);
      if (data.unreadCount) await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function followBack(actor: Actor) {
    setBusy(actor.id);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(actor.username)}/follow`, { method: "POST", credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update follow.");
      setFollowedBack((current) => ({ ...current, [actor.id]: Boolean(data.following) }));
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : "Unable to update follow.");
    } finally {
      setBusy(null);
    }
  }

  const followNotifications = notifications.filter((item) => item.type === "FOLLOW");

  return (
    <main className="min-h-screen bg-black px-5 py-8 pb-32 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/profile" className="text-sm text-white/35 hover:text-white">← Back to profile</Link>
        <header className="mt-7">
          <p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Social</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Notifications</h1>
          <p className="mt-3 text-sm text-white/35">See who is following you and follow them back when you want.</p>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}

        <section className="mt-7 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-2xl sm:p-7">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></div>
          ) : followNotifications.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/[0.07] text-2xl">👥</div>
              <h2 className="mt-5 text-lg font-semibold">No new followers yet</h2>
              <p className="mt-2 text-sm text-white/30">When someone follows you, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followNotifications.map((item) => {
                const actor = item.actor;
                const isFollowingBack = Boolean(followedBack[actor.id]);
                return (
                  <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                    <Link href={`/users/${encodeURIComponent(actor.username)}`} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.10] bg-red-600/10 text-red-300">
                      {actor.image ? <img src={actor.image} alt={actor.name} className="h-full w-full object-cover" /> : actor.name.charAt(0).toUpperCase()}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/users/${encodeURIComponent(actor.username)}`} className="font-semibold hover:text-red-300">{actor.name}</Link>
                      <p className="text-sm text-white/30">@{actor.username} followed you</p>
                    </div>
                    <button type="button" onClick={() => followBack(actor)} disabled={busy === actor.id || isFollowingBack} className="shrink-0 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.16] disabled:opacity-40">
                      {busy === actor.id ? "..." : isFollowingBack ? "Following" : "Follow back"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <MobileNav />
    </main>
  );
}
