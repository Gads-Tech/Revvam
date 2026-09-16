"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

type Actor = { id: string; name: string; username: string; image: string | null };
type ChatRequest = { id: string; status: "PENDING" | "ACCEPTED" | "DECLINED"; message: string | null } | null;
type Notification = {
  id: string;
  type: "FOLLOW" | "MESSAGE" | "CHAT_REQUEST" | "CHAT_ACCEPTED" | "POST_LIKE" | "POST_COMMENT" | "POST_SHARE" | "POST_MENTION";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  isRead: boolean;
  createdAt: string;
  actor: Actor;
  isFollowingActor: boolean;
  chatRequestId: string | null;
  chatRequest: ChatRequest;
};

function timeLabel(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function activityIcon(type: Notification["type"]) {
  if (type === "POST_LIKE") return "♥";
  if (type === "POST_COMMENT") return "○";
  if (type === "POST_SHARE") return "↗";
  return "@";
}

export default function ProfileNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [followedBack, setFollowedBack] = useState<Record<string, boolean>>({});

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true);
      const response = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load notifications.");
      setNotifications(data.notifications ?? []);
      const initial: Record<string, boolean> = {};
      for (const item of data.notifications ?? []) if (item.type === "FOLLOW") initial[item.actor.id] = Boolean(item.isFollowingActor);
      setFollowedBack(initial);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 3000);
    return () => window.clearInterval(timer);
  }, []);

  async function markRead(id: string) {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item));
    await fetch("/api/notifications", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: id }) });
  }

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

  async function handleChatRequest(item: Notification, action: "accept" | "decline") {
    if (!item.chatRequestId) return;
    setBusy(item.chatRequestId);
    try {
      const response = await fetch(`/api/chat-requests/${encodeURIComponent(item.chatRequestId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update chat request.");
      await markRead(item.id);
      setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true, chatRequest: notification.chatRequest ? { ...notification.chatRequest, status: action === "accept" ? "ACCEPTED" : "DECLINED" } : null } : notification));
      if (action === "accept" && data.conversationId) window.location.href = `/messages/${encodeURIComponent(item.actor.username)}`;
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Unable to update chat request.");
    } finally {
      setBusy(null);
    }
  }

  const chatRequests = notifications.filter((item) => item.type === "CHAT_REQUEST");
  const followNotifications = notifications.filter((item) => item.type === "FOLLOW");
  const activityNotifications = notifications.filter((item) => ["POST_LIKE", "POST_COMMENT", "POST_SHARE", "POST_MENTION"].includes(item.type));
  const otherNotifications = notifications.filter((item) => item.type === "MESSAGE" || item.type === "CHAT_ACCEPTED");

  return (
    <main className="min-h-screen bg-black px-5 py-8 pb-32 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4"><Link href="/home" className="text-sm text-white/35 hover:text-white">← Back to Discover</Link><Link href="/messages" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/60 hover:text-white">Messages</Link></div>
        <header className="mt-7"><p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Social center</p><h1 className="mt-2 text-4xl font-black tracking-[-0.045em]">Notifications</h1><p className="mt-3 text-sm text-white/35">Followers, chat requests, likes, comments, shares and tags update automatically.</p></header>
        {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}
        {loading ? <div className="mt-7 flex min-h-60 items-center justify-center rounded-[2rem] border border-white/[0.08] bg-white/[0.025]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></div> : <div className="mt-7 space-y-5">
          {chatRequests.length > 0 && <section className="rounded-[2rem] border border-red-400/20 bg-red-500/[0.04] p-5 sm:p-7"><div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/70">Private chat</p><h2 className="mt-1 text-xl font-bold">Chat requests</h2></div><div className="space-y-3">{chatRequests.map((item) => { const handled = item.chatRequest?.status !== "PENDING"; return <div key={item.id} className={`rounded-2xl border p-4 ${item.isRead ? "border-white/[0.06] bg-black/20" : "border-red-400/20 bg-red-500/[0.04]"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><Link href={`/users/${encodeURIComponent(item.actor.username)}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-red-600/10 text-red-300">{item.actor.image ? <img src={item.actor.image} alt={item.actor.name} className="h-full w-full object-cover" /> : item.actor.name.charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-semibold">{item.actor.name}</span><span className="block truncate text-sm text-white/30">@{item.actor.username} wants to chat with you</span></span></Link><span className="shrink-0 text-[10px] text-white/20">{timeLabel(item.createdAt)}</span></div>{item.chatRequest?.message && <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3 text-sm leading-6 text-white/55">“{item.chatRequest.message}”</div>}{handled ? <div className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/25">{item.chatRequest?.status === "ACCEPTED" ? "Chat accepted" : "Request declined"}</div> : <div className="mt-4 flex gap-2"><button type="button" disabled={busy === item.chatRequestId} onClick={() => handleChatRequest(item, "decline")} className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white/45 hover:bg-white/[0.05] hover:text-white">Decline</button><button type="button" disabled={busy === item.chatRequestId} onClick={() => handleChatRequest(item, "accept")} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/20">{busy === item.chatRequestId ? "..." : "Accept & chat"}</button></div>}</div>; })}</div></section>}
          {followNotifications.length > 0 && <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="mb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Your social circle</p><h2 className="mt-1 text-xl font-bold">New followers</h2></div><div className="space-y-3">{followNotifications.map((item) => { const actor = item.actor; const isFollowingBack = Boolean(followedBack[actor.id]); return <div key={item.id} onClick={() => !item.isRead && markRead(item.id)} className={`flex items-center gap-4 rounded-2xl border p-4 ${item.isRead ? "border-white/[0.06] bg-black/20" : "border-red-400/15 bg-red-500/[0.035]"}`}><Link href={`/users/${encodeURIComponent(actor.username)}`} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.10] bg-red-600/10 text-red-300">{actor.image ? <img src={actor.image} alt={actor.name} className="h-full w-full object-cover" /> : actor.name.charAt(0).toUpperCase()}</Link><div className="min-w-0 flex-1"><Link href={`/users/${encodeURIComponent(actor.username)}`} className="font-semibold hover:text-red-300">{actor.name}</Link><p className="text-sm text-white/30">@{actor.username} followed you</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/20">{item.isRead ? "Opened" : "New"} · {timeLabel(item.createdAt)}</p></div><button type="button" onClick={() => followBack(actor)} disabled={busy === actor.id || isFollowingBack} className="shrink-0 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/[0.16] disabled:opacity-40">{busy === actor.id ? "..." : isFollowingBack ? "Following" : "Follow back"}</button></div>; })}</div></section>}
          {activityNotifications.length > 0 && <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="mb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Post activity</p><h2 className="mt-1 text-xl font-bold">Likes, comments, shares & tags</h2></div><div className="space-y-2">{activityNotifications.map((item) => <Link key={item.id} href={item.href || "/home"} onClick={() => !item.isRead && markRead(item.id)} className={`flex items-center gap-3 rounded-2xl border p-4 ${item.isRead ? "border-white/[0.06] bg-black/20" : "border-red-400/15 bg-red-500/[0.035]"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.type === "POST_LIKE" ? "bg-red-500/10 text-red-300" : "bg-white/[0.05] text-white/65"}`}>{activityIcon(item.type)}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="block truncate font-medium">{item.title}</span><span className="shrink-0 text-[10px] text-white/20">{timeLabel(item.createdAt)}</span></span><span className="mt-1 block text-sm text-white/30">{item.body}</span><span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-white/20">{item.isRead ? "Opened" : "New"}</span></span></Link>)}</div></section>}
          {otherNotifications.length > 0 && <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7"><div className="mb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Activity</p><h2 className="mt-1 text-xl font-bold">Messages & updates</h2></div><div className="space-y-2">{otherNotifications.map((item) => <Link key={item.id} href={item.href || "/messages"} onClick={() => !item.isRead && markRead(item.id)} className={`flex items-center gap-3 rounded-2xl border p-4 ${item.isRead ? "border-white/[0.06] bg-black/20" : "border-red-400/15 bg-red-500/[0.035]"}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">{item.type === "CHAT_ACCEPTED" ? "✓" : "✉"}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="block truncate font-medium">{item.title}</span><span className="shrink-0 text-[10px] text-white/20">{timeLabel(item.createdAt)}</span></span><span className="mt-1 block text-sm text-white/30">{item.body}</span><span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-white/20">{item.isRead ? "Opened" : "New"}</span></span></Link>)}</div></section>}
          {notifications.length === 0 && <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] px-6 py-16 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/[0.07] text-2xl">✦</div><h2 className="mt-5 text-lg font-semibold">You&apos;re all caught up</h2><p className="mt-2 text-sm text-white/30">New followers, likes, comments, shares, tags and chat activity will appear here.</p></section>}
        </div>}
      </div>
      <MobileNav />
    </main>
  );
}
