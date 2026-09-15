"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";
import LiveSocialActions from "@/components/LiveSocialActions";

type User = { id: string; name: string; username: string; image: string | null; role?: string | null; onboardingType?: string | null };
type Conversation = { id: string; updatedAt: string; otherUser: User | null; lastMessage: { content: string; createdAt: string; senderId: string; opened: boolean } | null; unreadCount: number };

function timeLabel(value: string) {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadConversations(silent = false) {
    try {
      if (!silent) setLoading(true);
      const response = await fetch(`/api/messages?_=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load messages.");
      setConversations(data.conversations ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(true), 1200);
    const onFocus = () => void loadConversations(true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (response.ok && data.success) setResults(data.users ?? []);
      } catch {
        // Search was cancelled.
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Link href="/home" className="text-xs text-white/30 hover:text-white">← Back to Discover</Link>
            <p className="mt-5 text-xs uppercase tracking-[0.22em] text-red-400/70">Revvam social</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.045em]">Messages</h1>
            <p className="mt-2 text-sm text-white/30">Your private conversations.</p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <LiveSocialActions />
            <Link href="/messages/settings" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/50 hover:text-white">Read receipts</Link>
          </div>
        </div>

        <div className="mt-4 flex justify-end md:hidden">
          <Link href="/messages/settings" className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/50 hover:text-white">Read receipts</Link>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="mt-6 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <div className="relative">
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 focus-within:border-red-400/30"><span className="text-white/25">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search someone to start a chat request..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20" /></div>
            {results.length > 0 && <div className="absolute left-0 right-0 top-14 z-30 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0b0b0b] shadow-2xl">{results.map((result) => <Link key={result.id} href={`/messages/${encodeURIComponent(result.username)}`} onClick={() => setSearch("")} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0 hover:bg-white/[0.04]"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600/10 text-sm font-bold text-red-300">{result.image ? <img src={result.image} alt="" className="h-full w-full object-cover" /> : result.name.charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{result.name}</span><span className="block truncate text-xs text-white/30">@{result.username}</span></span><span className="text-[10px] uppercase tracking-[0.14em] text-red-300/60">Chat</span></Link>)}</div>}
          </div>
        </div>

        <section className="mt-5 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025]">
          <div className="border-b border-white/[0.07] px-5 py-4 sm:px-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/25">Conversations</p></div>
          {loading ? <div className="flex min-h-72 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></div> : conversations.length === 0 ? <div className="px-6 py-20 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/[0.07] text-2xl">💬</div><h2 className="mt-5 text-lg font-semibold">No conversations yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">Search for another Revvam user above to start a request.</p></div> : <div>{conversations.map((conversation) => { if (!conversation.otherUser) return null; const unread = conversation.unreadCount > 0; const mine = conversation.lastMessage?.senderId !== conversation.otherUser.id; return <Link key={conversation.id} href={`/messages/${encodeURIComponent(conversation.otherUser.username)}`} className={`flex items-center gap-4 border-b px-5 py-4 transition sm:px-6 ${unread ? "border-red-500/20 bg-red-500/[0.065] shadow-[inset_3px_0_0_rgba(239,68,68,0.75)] hover:bg-red-500/[0.09]" : "border-white/[0.06] hover:bg-white/[0.035]"}`}><span className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-red-600/10 text-sm font-bold text-red-300 ${unread ? "border-red-400/40" : "border-white/[0.08]"}`}>{conversation.otherUser.image ? <img src={conversation.otherUser.image} alt="" className="h-full w-full object-cover" /> : conversation.otherUser.name.charAt(0).toUpperCase()}{unread && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-black bg-red-500 px-1 text-[8px] font-black text-white" />}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className={`truncate text-sm ${unread ? "font-black text-white" : "font-semibold text-white/80"}`}>{conversation.otherUser.name}</span><span className="shrink-0 text-[10px] text-white/20">{conversation.lastMessage ? timeLabel(conversation.lastMessage.createdAt) : ""}</span></span><span className="mt-0.5 block truncate text-xs text-white/30">@{conversation.otherUser.username}</span>{conversation.lastMessage && <span className={`mt-1 block truncate text-sm ${unread ? "font-semibold text-white/75" : "text-white/25"}`}>{mine && <span className="mr-1 text-white/35">You:</span>}{conversation.lastMessage.content}</span>}{unread ? <span className="mt-1.5 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-red-300">New message</span> : mine && conversation.lastMessage ? conversation.lastMessage.opened ? <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-red-300/70">Opened</span> : <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/25">Sent</span> : null}</span><span className="text-white/15">›</span></Link>; })}</div>}
        </section>
      </div>
      <MobileNav />
    </main>
  );
}
