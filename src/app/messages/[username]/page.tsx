"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import MobileNav from "@/components/MobileNav";

type User = { id: string; name: string; username: string; image: string | null; role?: string | null; onboardingType?: string | null };
type Message = { id: string; senderId: string; content: string; createdAt: string; sender: User; opened?: boolean };
type ChatStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "DECLINED" | "DECLINED_BY_TARGET" | "ACCEPTED" | "SELF";

export default function IndividualMessagePage() {
  const params = useParams();
  const router = useRouter();
  const username = String(params.username || "");
  const [user, setUser] = useState<User | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("NONE");
  const [conversationId, setConversationId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(true);
  const [error, setError] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const initialScrollRef = useRef(true);
  const isComposer = username === "new";

  async function loadTarget() {
    if (!username || isComposer) return;
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load user.");
      setUser(data.user);
      const chatResponse = await fetch(`/api/users/${encodeURIComponent(username)}/chat-request`, { credentials: "include", cache: "no-store" });
      const chatData = await chatResponse.json();
      if (chatResponse.ok && chatData.success) {
        setChatStatus(chatData.status as ChatStatus);
        setConversationId(chatData.conversationId || "");
        if (chatData.message) setRequestMessage(chatData.message);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load user."); }
    finally { setLoading(false); }
  }

  async function loadConversation(id: string, silent = false) {
    if (!id) return;
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(id)}?_=${Date.now()}`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json", "Cache-Control": "no-cache" } });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load chat.");
      setMessages(data.messages ?? []);
      setReceiptVisible(data.readReceiptsEnabledForOtherUser ?? true);
      if (data.otherUser) setUser(data.otherUser);
    } catch (e) { if (!silent) setError(e instanceof Error ? e.message : "Unable to load chat."); }
  }

  useEffect(() => { loadTarget(); }, [username]);
  useEffect(() => {
    if (!conversationId) return;
    initialScrollRef.current = true;
    loadConversation(conversationId);
    const timer = window.setInterval(() => loadConversation(conversationId, true), 1500);
    return () => window.clearInterval(timer);
  }, [conversationId]);

  // Scroll only the message list. Do not use scrollIntoView(), because that can
  // scroll the whole page and push the fixed composer/send bar below the viewport.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: initialScrollRef.current ? "auto" : "smooth" });
    initialScrollRef.current = false;
  }, [messages]);

  useEffect(() => {
    if (!isComposer || search.trim().length < 1) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`, { credentials: "include", cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (response.ok && data.success) setResults(data.users ?? []);
      } catch { /* aborted */ }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [isComposer, search]);

  const title = useMemo(() => user ? (user.name || `@${user.username}`) : `@${username}`, [user, username]);

  async function sendRequest() {
    if (!user || !requestMessage.trim() || requestBusy) return;
    setRequestBusy(true); setError("");
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.username)}/chat-request`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: requestMessage.trim() }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to send chat request.");
      setChatStatus(data.status as ChatStatus); setRequestMessage("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send chat request."); }
    finally { setRequestBusy(false); }
  }

  async function sendMessage() {
    const clean = content.trim();
    if (!conversationId || !clean || sending) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: clean }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to send message.");
      setContent(""); await loadConversation(conversationId, true);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send message."); }
    finally { setSending(false); }
  }

  if (isComposer) return (
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white sm:px-6 sm:py-8"><div className="mx-auto max-w-3xl"><Link href="/messages" className="text-sm text-white/35 hover:text-white">← Back to messages</Link><div className="mt-7 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-8"><p className="text-xs uppercase tracking-[0.22em] text-red-400/70">New conversation</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Find someone on Revvam</h1><p className="mt-3 text-sm leading-6 text-white/35">Search for a driver or car enthusiast, then send a chat request with a short message.</p><div className="relative mt-7"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username..." className="h-12 w-full rounded-2xl border border-white/[0.10] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/30" />{results.length > 0 && <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0b0b0b] shadow-2xl">{results.map((result) => <Link key={result.id} href={`/messages/${encodeURIComponent(result.username)}`} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0 hover:bg-white/[0.04]"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600/10 text-sm font-bold text-red-300">{result.image ? <img src={result.image} alt="" className="h-full w-full object-cover" /> : result.name.charAt(0).toUpperCase()}</span><span><span className="block text-sm font-semibold">{result.name}</span><span className="block text-xs text-white/30">@{result.username}</span></span></Link>)}</div>}</div></div></div><MobileNav /></main>
  );

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></main>;

  return (
    <main className="min-h-screen bg-black px-4 py-5 pb-28 text-white sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025]">
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-6">
          <button type="button" onClick={() => router.push("/messages")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/55 hover:text-white">←</button>
          {user && <Link href={`/users/${encodeURIComponent(user.username)}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-red-300"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600/10 text-sm font-bold text-red-300">{user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-semibold">{title}</span><span className="block truncate text-xs text-white/30">@{user.username}</span></span></Link>}
          {chatStatus === "ACCEPTED" && <Link href="/messages/settings" className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-white/40 hover:text-white">Receipts</Link>}
        </header>
        {error && <div className="mx-4 mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300 sm:mx-6">{error}</div>}

        {chatStatus !== "ACCEPTED" ? <div className="flex flex-1 items-center justify-center p-5 sm:p-10"><div className="w-full max-w-xl rounded-[2rem] border border-red-400/15 bg-red-500/[0.035] p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/70">Private chat request</p><h1 className="mt-2 text-2xl font-black">Say hello to {title}</h1><p className="mt-3 text-sm leading-6 text-white/35">Send a short message with your request. They must accept before the private chat opens.</p>{chatStatus === "PENDING_SENT" ? <div className="mt-7 rounded-2xl border border-white/[0.08] bg-black/20 p-5"><p className="text-sm font-semibold text-white/70">Request sent</p><p className="mt-2 text-sm text-white/30">Waiting for @{user?.username} to accept.</p></div> : chatStatus === "PENDING_RECEIVED" ? <div className="mt-7 rounded-2xl border border-white/[0.08] bg-black/20 p-5"><p className="text-sm font-semibold text-white/70">They already sent you a request.</p><Link href="/profile/notifications" className="mt-4 inline-flex rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-200">Review request</Link></div> : <><textarea value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} maxLength={1000} rows={5} placeholder="Write a message with your request..." className="mt-7 w-full resize-none rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-red-400/30" /><div className="mt-3 flex justify-end"><button type="button" onClick={sendRequest} disabled={requestBusy || !requestMessage.trim()} className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-2.5 text-xs font-semibold text-red-200 disabled:opacity-40">{requestBusy ? "Sending..." : "Send chat request"}</button></div></>}</div></div> : <>
          <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-6 sm:px-7">
            {messages.length === 0 ? <p className="py-16 text-center text-sm text-white/25">No messages yet. Say hello.</p> : messages.map((message) => { const mine = message.sender.id !== user?.id; const opened = mine && message.opened && receiptVisible; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-br-md bg-red-600/20 text-white" : "rounded-bl-md bg-white/[0.06] text-white/75"}`}><div>{message.content}</div>{mine && <div className={`mt-1 text-right text-[9px] font-bold uppercase tracking-[0.14em] ${opened ? "text-red-300/70" : "text-white/25"}`}>{opened ? "Opened" : "Sent"}</div>}</div></div>; })}
          </div>
          <div className="shrink-0 border-t border-white/[0.07] bg-[#080808] p-4 sm:p-5"><div className="flex gap-2"><textarea value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={1} placeholder="Write a message..." className="min-h-11 flex-1 resize-none rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/30" /><button type="button" onClick={sendMessage} disabled={sending || !content.trim()} className="shrink-0 rounded-2xl border border-red-400/20 bg-red-500/[0.12] px-5 text-sm font-semibold text-red-300 disabled:opacity-40">{sending ? "..." : "Send"}</button></div></div>
        </>}
      </div>
      <MobileNav />
    </main>
  );
}
