"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

type Actor = { id: string; name: string; username: string; image: string | null };
type Notification = {
  id: string;
  type: "FOLLOW" | "MESSAGE" | "CHAT_REQUEST" | "CHAT_ACCEPTED";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  actor: Actor;
  isFollowingActor: boolean;
  chatRequestId: string | null;
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
      for (const item of data.notifications ?? []) if (item.type === "FOLLOW") initial[item.actor.id] = Boolean(item.isFollowingActor);
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

  async function handleChatRequest(requestId: string, action: "accept" | "decline") {
    setBusy(requestId);
    try {
      const response = await fetch(`/api/chat-requests/${encodeURIComponent(requestId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update chat request.");
      setNotifications((current) => current.filter((item) => item.chatRequestId !== requestId));
      if (action === "accept" && data.conversationId) window.location.href = `/messages?conversation=${encodeURIComponent(data.conversationId)}`;
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Unable to update chat request.");
    } finally {
      setBusy(null);
    }
  }

  const followNotifications = notifications.filter((item) => item.type === "FOLLOW");
  const chatRequests = notifications.filter((item) => item.type === "CHAT_REQUEST" && item.chatRequestId);
  const otherNotifications = notifications.filter((item) => item.type === "MESSAGE" || item.type === "CHAT_ACCEPTED");

  return (
    <main className="min-h-screen bg-black px-5 py-8 pb-32 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/home" className="text-sm text-white/35 hover:text-white">← Back to Discover</Link>
        <header className="mt-7">
          <p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Social center</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Notifications</h1>
          <p className="mt-3 text-sm text-white/35">Followers, chat requests and important Revvam activity live here.</p>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}

        {loading ? <div className="mt-7 flex min-h-60 items-center justify-center rounded-[2rem] border border-white/[0.08] bg-white/[0.025]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></div> : (
          <div className="mt-7 space-y-5">
            {chatRequests.length > 0 && <section className="rounded-[2rem] border border-red-400/20 bg-red-500/[0.04] p-5 sm:p-7"><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/70">Private chat</p><h2 className="mt-1 text-xl font-bold">Chat requests</h2><p className="mt-1 text-sm text-white/30">Accept a request before a private conversation can begin.</p></div><div className="space-y-3">{chatRequests.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-black/25 p-4 sm:flex-row sm:items-center"><Link href={`/users/${encodeURIComponent(item.actor.username)}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-red-600/10 text-red-300">{item.actor.image ? <img src={item.actor.image} alt={item.actor.name} className="h-full w-full object-cover" /> : item.actor.name.charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-semibold">{item.actor.name}</span><span className="block truncate text-sm text-white/30">@{item.actor.username} wants to chat with you</span></span></Link><div className="flex gap-2 sm:shrink-0"><button type="button" disabled={busy === item.chatRequestId} onClick={() => handleChatRequest(item.chatRequestId!, "decline")} className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white/45 hover:bg-white/[0.05] hover:text-white">Decline</button><button type="button" disabled={busy === item.chatRequestId} onClick={() => handleChatRequest(item.chatRequestId!, "accept")} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/20">{busy === item.chatRequestId ? "..." : "Accept & chat"}</button></div></div>)}</div></section>}

            {followNotifications.length > 0 && <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="mb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Your social circle</p><h2 className="mt-1 text-xl font-bold">New followers</h2></div><div className="space-y-3">{followNotifications.map((item) => { const actor = item.actor; const isFollowingBack = Boolean(followedBack[actor.id]); return <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4"><Link href={`/users/${encodeURIComponent(actor.username)}`} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.10] bg-red-600/10 text-red-300">{actor.image ? <img src={actor.image} alt={actor.name} className="h-full w-full object-cover" /> : actor.name.charAt(0).toUpperCase()}</Link><div className="min-w-0 flex-1"><Link href={`/users/${encodeURIComponent(actor.username)}`} className="font-semibold hover:text-red-300">{actor.name}</Link><p className="text-sm text-white/30">@{actor.username} followed you</p></div><button type="button" onClick={() => followBack(actor)} disabled={busy === actor.id || isFollowingBack} className="shrink-0 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.16] disabled:opacity-40">{busy === actor.id ? "..." : isFollowingBack ? "Following" : "Follow back"}</button></div>; })}</div></section>}

            {otherNotifications.length > 0 && <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="mb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Activity</p><h2 className="mt-1 text-xl font-bold">Recent updates</h2></div><div className="space-y-2">{otherNotifications.map((item) => <Link key={item.id} href={item.href || "/messages"} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-4 hover:border-white/[0.12]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">{item.type === "CHAT_ACCEPTED" ? "✓" : "✉"}</span><span className="min-w-0"><span className="block font-medium">{item.title}</span><span className="block text-sm text-white/30">{item.body}</span></span></Link>)}</div></section>}

            {chatRequests.length === 0 && followNotifications.length === 0 && otherNotifications.length === 0 && <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] px-6 py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/[0.07] text-2xl">✦</div><h2 className="mt-5 text-lg font-semibold">You&apos;re all caught up</h2><p className="mt-2 text-sm text-white/30">New followers, chat requests and social activity will appear here.</p></section>}
          </div>
        )}
      </div>
      <MobileNav />
    </main>
  );
}
